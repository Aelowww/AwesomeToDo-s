const express = require("express");
const { ObjectId } = require("mongodb");
const { getCollection, getClasses } = require("./models/index");
const { requireAuth } = require("./auth");
const { getProvider, AiError } = require("./aiProviders");

const router = express.Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SYSTEM_PROMPT = `You are Study Buddy, the assistant inside Awesome ToDo's, a planner for students.

You help the student plan their week, decide what to work on first, break big assignments into steps, understand topics, and review for exams (quizzes, flashcards, explanations, practice questions). You can see their open tasks and class schedule below, so use them when they are relevant, and refer to tasks and classes by name.

Style: friendly, encouraging and practical. Keep answers short and easy to skim: short paragraphs, bulleted or numbered lists, and **bold** for key points. Do not use tables or code blocks unless the student asks for code.

When a student asks you to complete graded work for them, help them actually learn it: explain, outline, give feedback on their draft, or work through a similar example, rather than handing over a finished submission.

You are also the app's help desk. Answer any question about using Awesome ToDo's with exact steps, using the guide below. Never invent features: if something isn't in the guide, say the app doesn't have it yet and suggest the closest thing it does have. If asked who you are, you're Study Buddy, the Awesome ToDo's assistant.

APP GUIDE
Navigation: Home, Tasks, Classes and Profile are in the sidebar (computer) or the bottom tab bar (phone). Focus is in the sidebar on computers; on phones use the Focus timer card on Home, or the timer badge at the top while a session runs. You (Study Buddy) are the bird bubble in the bottom-right corner of every page.
Home: today's progress ring, quick add box, stat tiles (due today, overdue, done today, focus today), this week's strip (dots = deadlines; tap a day to open the calendar), today's classes timeline with a live progress bar, a 7-day chart of completed tasks, upcoming deadline countdowns, and a Focus timer shortcut.
Tasks (List): type a task and press Create To Do, or use the quick add on Home. "Details" sets subject, type (task, assignment, exam/quiz, project, reading), priority and due date (quick buttons: Today, Tomorrow, In a week). Tap a task to open its steps and notes; "Break down with AI" adds steps automatically. The circle checkbox completes a task (the app asks to confirm, then shows "Task complete!" with Undo). The pencil edits, the timer icon starts a focus session on that task, the trash icon deletes it (asks to confirm; Undo appears). Tabs: All, Today, Next 7 days, Overdue, Done. Search box and subject/type/sort filters. "Clear completed" deletes finished tasks. On a computer, press N for a new task and / to search. On phones, tap a task to show its buttons.
Tasks (Calendar): open Tasks, then the Calendar switch at the top. Month view of deadlines colored by class; tap a day to see what's due and add a task for that date.
Classes (Schedule): "Add class" asks for the class name, code/section, teacher, room, color, and the days and times it meets. "Edit classes" lists every class to edit or delete. Tapping a class in the weekly timetable also edits it. Class names become task subjects with matching colors.
Classes (Grades): open Classes, then the Grades switch. For each class, add an assessment with a name, score, "out of" and weight %. The app shows the weighted average and an overall average. Set a target grade to see the average needed on the remaining weight.
Focus: Pomodoro timer with Focus, Short break and Long break. One-tap lengths: focus 15/25/45/60 min, short break 5/10/15, long break 15/20/30, or "Custom time" for any length from 1 to 120 minutes. Pick a task under "Working on" to credit sessions to it. A long break comes after every 4 focus sessions. The timer keeps running while you use other pages.
Profile: tap the camera on your photo to change it. "Edit profile" changes photo, name, school, course/strand and year level (these show on your profile card). "Security" changes your email (needs your password) and your password. "Appearance" switches Light, Dark or Auto; the sun/moon button in the sidebar or the phone's top bar also switches it. Privacy policy, Terms of use and Sign out are there too. Deleting an account isn't available in the app; ask your admin.
Sign in: "Forgot password?" first tells you to contact your admin; "Reset by email" sends a one-time link that works for 30 minutes. New accounts get a short welcome tour.
Install: on a phone use "Add to Home Screen"; on a computer use the Install button in Chrome or Edge. The app then opens like a normal app.
Privacy: each account sees only its own data. Your messages to Study Buddy, plus a summary of your open tasks and classes, are sent to an AI service to write answers.`;

// Simple in-memory limit of AI requests per user.
const usage = new Map();
const LIMIT_WINDOW_MS = 60 * 60 * 1000;
const LIMIT_MAX = 40;

const rateLimit = (req, res, next) => {
  const now = Date.now();
  const key = req.userId.toString();
  const recent = (usage.get(key) || []).filter((time) => now - time < LIMIT_WINDOW_MS);
  if (recent.length >= LIMIT_MAX) {
    usage.set(key, recent);
    return res.status(429).json({ mssg: "You've reached the AI limit for this hour. Try again a bit later." });
  }
  recent.push(now);
  usage.set(key, recent);
  next();
};

const requireProvider = (req, res, next) => {
  req.ai = getProvider();
  if (!req.ai) {
    return res.status(503).json({ mssg: "AI isn't set up yet. Add GEMINI_API_KEY to the server's .env file." });
  }
  next();
};

const timeLabel = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// A short plain-text snapshot of the student's tasks and schedule for the model.
const buildContext = async (userId, today) => {
  const [todos, classes] = await Promise.all([
    getCollection().find({ userId, status: false }).limit(80).toArray(),
    getClasses().find({ userId }).limit(30).toArray(),
  ]);

  todos.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));

  const taskLines = todos.map((t) => {
    const parts = [`- ${t.todo}`];
    if (t.subject) parts.push(`subject: ${t.subject}`);
    if (t.type && t.type !== "task") parts.push(`type: ${t.type}`);
    if (t.priority === "high") parts.push("high priority");
    parts.push(t.dueDate ? `due ${t.dueDate}` : "no due date");
    const steps = Array.isArray(t.subtasks) ? t.subtasks : [];
    if (steps.length) parts.push(`${steps.filter((s) => s.done).length}/${steps.length} steps done`);
    return parts.join(" | ");
  });

  const classLines = classes.map((c) => {
    const times = (c.meetings || [])
      .map((m) => `${DAYS[m.day]} ${timeLabel(m.start)}-${timeLabel(m.end)}`)
      .join(", ");
    const extra = [c.code, c.teacher && `teacher ${c.teacher}`, c.room && `room ${c.room}`].filter(Boolean).join(", ");
    return `- ${c.name}${extra ? ` (${extra})` : ""}${times ? `: ${times}` : ""}`;
  });

  const weekday = DAYS[new Date(`${today}T12:00:00`).getDay()];
  return [
    `Today is ${weekday}, ${today}.`,
    `Open tasks (${todos.length}):`,
    taskLines.length ? taskLines.join("\n") : "- none",
    `Classes (${classes.length}):`,
    classLines.length ? classLines.join("\n") : "- none added yet",
  ].join("\n");
};

const readToday = (body) => (DATE_RE.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10));

const sendError = (res, error) => {
  if (!(error instanceof AiError)) throw error;
  res.status(error.status).json({ mssg: error.message });
};

// GET /ai/status
router.get("/status", (req, res) => {
  const provider = getProvider();
  res.status(200).json({ enabled: Boolean(provider), provider: provider?.name ?? null });
});

// POST /ai/breakdown  { taskId, today } -> { steps: string[] }
router.post("/breakdown", requireProvider, rateLimit, async (req, res) => {
  if (!ObjectId.isValid(req.body?.taskId)) return res.status(400).json({ mssg: "invalid task" });

  const task = await getCollection().findOne({ _id: new ObjectId(req.body.taskId), userId: req.userId });
  if (!task) return res.status(404).json({ mssg: "todo not found" });

  const details = [
    `Task: ${task.todo}`,
    task.subject && `Subject: ${task.subject}`,
    task.type && task.type !== "task" && `Type: ${task.type}`,
    task.dueDate && `Due: ${task.dueDate} (today is ${readToday(req.body)})`,
    task.notes && `Student's notes: ${task.notes.slice(0, 2000)}`,
    Array.isArray(task.subtasks) && task.subtasks.length && `Steps they already have: ${task.subtasks.map((s) => s.text).join("; ")}`,
  ].filter(Boolean).join("\n");

  try {
    const steps = await req.ai.listSteps(
      SYSTEM_PROMPT,
      `Break this task into 3 to 7 concrete, doable steps, in the order a student should do them. Each step is one short action (under 12 words). Don't repeat steps they already have. Reply as JSON: {"steps": [...]}.\n\n${details}`
    );
    res.status(200).json({
      steps: steps.filter((s) => typeof s === "string" && s.trim()).slice(0, 10).map((s) => s.trim().slice(0, 200)),
    });
  } catch (error) {
    sendError(res, error);
  }
});

const readMessages = (body) => {
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) return null;

  const clean = [];
  for (const [index, m] of messages.entries()) {
    const role = index % 2 === 0 ? "user" : "assistant";
    if (m?.role !== role || typeof m.content !== "string" || !m.content.trim()) return null;
    clean.push({ role, content: m.content.slice(0, 8000) });
  }
  return clean[clean.length - 1].role === "user" ? clean : null;
};

// POST /ai/chat  { messages, today } -> server-sent events: {text} ... {done} or {error}
router.post("/chat", requireProvider, rateLimit, async (req, res) => {
  const messages = readMessages(req.body);
  if (!messages) return res.status(400).json({ mssg: "invalid messages" });

  const context = await buildContext(req.userId, readToday(req.body));
  const system = `${SYSTEM_PROMPT}\n\nThe student's planner right now:\n${context}`;

  let started = false;
  const send = (payload) => {
    if (!started) {
      res.status(200).set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders();
      started = true;
    }
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Stop generating if the student closes the chat.
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });

  try {
    const { truncated } = await req.ai.streamChat(system, messages, {
      onText: (text) => send({ text }),
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    send({ done: true, truncated });
    res.end();
  } catch (error) {
    if (controller.signal.aborted) return;
    if (!(error instanceof AiError)) throw error;
    if (started) {
      send({ error: error.message });
      res.end();
    } else {
      res.status(error.status).json({ mssg: error.message });
    }
  }
});

module.exports = { aiRouter: router };
