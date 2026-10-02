// The AI providers Study Buddy can use. Gemini is used when GEMINI_API_KEY is set,
// otherwise Claude when ANTHROPIC_API_KEY is set. Both expose the same two calls:
//   listSteps(system, prompt)                      -> string[]
//   streamChat(system, messages, { onText, signal }) -> { truncated }
// and throw AiError with a status and a message the student can act on.

class AiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const STEPS_SCHEMA_PROPS = { steps: { type: "array", items: { type: "string" } } };

const parseSteps = (text) => {
  try {
    const steps = JSON.parse(text ?? "{}").steps;
    if (Array.isArray(steps)) return steps;
  } catch {
    // fall through
  }
  throw new AiError(502, "The AI gave an unexpected answer. Please try again.");
};

/* ---------------- Gemini ---------------- */

const createGemini = (apiKey) => {
  const { GoogleGenAI } = require("@google/genai");
  const client = new GoogleGenAI({ apiKey });

  // Try the newest fast model first, then fall back when Google reports it busy or unavailable.
  const models = [...new Set([
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
  ])];
  const RETRYABLE = new Set([404, 429, 500, 502, 503, 504]);

  const toAiError = (error) => {
    if (error instanceof AiError) return error;
    const status = error?.status;
    const text = String(error?.message || "");
    if (status === 400 && /API key|API_KEY/i.test(text)) return new AiError(503, "The Gemini API key on the server is invalid. Check GEMINI_API_KEY.");
    if (status === 401 || status === 403) return new AiError(503, "The Gemini API key on the server is invalid. Check GEMINI_API_KEY.");
    if (status === 429) return new AiError(429, "The AI is busy right now. Please try again in a minute.");
    if (status) {
      console.error("Gemini API error", status, text.slice(0, 300));
      return new AiError(502, "The AI couldn't answer right now. Please try again.");
    }
    throw error;
  };

  const blocked = (response) =>
    Boolean(response?.promptFeedback?.blockReason) ||
    ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"].includes(response?.candidates?.[0]?.finishReason);

  const withFallback = async (run) => {
    let lastError;
    for (const model of models) {
      try {
        return await run(model);
      } catch (error) {
        lastError = error;
        if (!RETRYABLE.has(error?.status)) break;
      }
    }
    throw toAiError(lastError);
  };

  return {
    name: "gemini",

    listSteps: (system, prompt) => withFallback(async (model) => {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: { type: "object", properties: STEPS_SCHEMA_PROPS, required: ["steps"] },
        },
      });
      if (blocked(response)) throw new AiError(422, "The AI couldn't help with this task. Try rewording it.");
      return parseSteps(response.text);
    }),

    streamChat: async (system, messages, { onText, signal }) => {
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Only fall back before anything was sent; once text is flowing, finish on the same model.
      const stream = await withFallback((model) =>
        client.models.generateContentStream({
          model,
          contents,
          config: { systemInstruction: system, abortSignal: signal },
        })
      );

      let last;
      try {
        for await (const chunk of stream) {
          if (signal?.aborted) return { truncated: true };
          last = chunk;
          if (chunk.text) onText(chunk.text);
        }
      } catch (error) {
        if (signal?.aborted) return { truncated: true };
        throw toAiError(error);
      }
      if (blocked(last)) throw new AiError(422, "The AI couldn't help with that one. Try asking a different way.");
      return { truncated: last?.candidates?.[0]?.finishReason === "MAX_TOKENS" };
    },
  };
};

/* ---------------- Claude ---------------- */

const createClaude = () => {
  const Anthropic = require("@anthropic-ai/sdk").default;
  const client = new Anthropic();
  const MODEL = "claude-opus-5-5";
  // If Claude declines a request, the API retries it on a recommended fallback model.
  const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

  const toAiError = (error) => {
    if (error instanceof AiError) return error;
    if (error instanceof Anthropic.AuthenticationError) return new AiError(503, "The AI key on the server is invalid. Check ANTHROPIC_API_KEY.");
    if (error instanceof Anthropic.RateLimitError) return new AiError(429, "The AI is busy right now. Please try again in a minute.");
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error", error.status, error.message);
      return new AiError(502, "The AI couldn't answer right now. Please try again.");
    }
    throw error;
  };

  return {
    name: "claude",

    listSteps: async (system, prompt) => {
      try {
        const response = await client.beta.messages.create({
          ...FALLBACK,
          model: MODEL,
          max_tokens: 16000,
          output_config: {
            effort: "low",
            format: {
              type: "json_schema",
              schema: { type: "object", properties: STEPS_SCHEMA_PROPS, required: ["steps"], additionalProperties: false },
            },
          },
          system,
          messages: [{ role: "user", content: prompt }],
        });
        if (response.stop_reason === "refusal") throw new AiError(422, "The AI couldn't help with this task. Try rewording it.");
        return parseSteps(response.content.find((block) => block.type === "text")?.text);
      } catch (error) {
        throw toAiError(error);
      }
    },

    streamChat: async (system, messages, { onText, signal }) => {
      const stream = client.beta.messages.stream({
        ...FALLBACK,
        model: MODEL,
        max_tokens: 32000,
        output_config: { effort: "low" },
        system,
        messages,
      });
      signal?.addEventListener("abort", () => stream.abort());

      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") onText(event.delta.text);
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") throw new AiError(422, "The AI couldn't help with that one. Try asking a different way.");
        return { truncated: final.stop_reason === "max_tokens" };
      } catch (error) {
        if (signal?.aborted || error instanceof Anthropic.APIUserAbortError) return { truncated: true };
        throw toAiError(error);
      }
    },
  };
};

let provider;
let providerKey;

const getProvider = () => {
  const key = process.env.GEMINI_API_KEY ? `gemini:${process.env.GEMINI_API_KEY}` : process.env.ANTHROPIC_API_KEY ? "claude" : null;
  if (key !== providerKey) {
    providerKey = key;
    provider = !key ? null : key === "claude" ? createClaude() : createGemini(process.env.GEMINI_API_KEY);
  }
  return provider;
};

module.exports = { getProvider, AiError };
