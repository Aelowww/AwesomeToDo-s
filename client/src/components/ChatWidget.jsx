import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Markdown from './Markdown'

const STARTERS = [
  { icon: '\u{1F4C5}', title: 'Plan my week', prompt: 'Make me a realistic study plan for this week based on my tasks and classes.' },
  { icon: '\u{1F3AF}', title: 'What first?', prompt: 'What should I work on first today, and why?' },
  { icon: '\u{1F9E0}', title: 'Quiz me', prompt: 'Quiz me with 5 practice questions for my next exam. Ask one at a time and wait for my answer.' },
  { icon: '\u{1F4A1}', title: 'Explain simply', prompt: 'Explain this topic to me simply, with an example: ' },
  { icon: '\u{2753}', title: 'App help', prompt: "How do I use Awesome ToDo's? Give me a quick tour of what I can do." },
  { icon: '\u{1F680}', title: 'Get unstuck', prompt: "I keep procrastinating on my biggest assignment. Help me get started in the next 15 minutes." },
]

export default function ChatWidget({ open, onOpenChange, unread, aiEnabled, chat }) {
  const { messages, streaming, error, send, stop, reset, clearError } = chat
  const [input, setInput] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // Keep the newest message in view.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && onOpenChange(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const toggle = () => onOpenChange(!open)

  const submit = async (text = input) => {
    if (!text.trim() || streaming) return
    setInput('')
    const ok = await send(text)
    if (!ok) setInput(text)
  }

  // Starters ending with ": " need the student to add a topic first.
  const applyStarter = (prompt) => {
    if (prompt.endsWith(': ')) {
      setInput(prompt)
      inputRef.current?.focus()
    } else {
      submit(prompt)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`chat-launcher${open ? ' is-open' : ''}`}
        onClick={toggle}
        aria-label={open ? 'Close Study Buddy' : 'Open Study Buddy'}
        aria-expanded={open}
      >
        <span className="chat-launcher__icon">
          {open ? <Icon name="close" size={22} /> : <img src="/bird-128.png" alt="" width="44" height="44" />}
        </span>
        {!open && <span className="chat-launcher__label">Study Buddy</span>}
        {unread && !open && <span className="chat-launcher__dot" aria-label="New answer" />}
      </button>

      {open && (
        <section className="chat-panel" role="dialog" aria-label="Study Buddy">
          <header className="chat-panel__head">
            <span className="chat-avatar"><img src="/bird-128.png" alt="" width="38" height="38" /></span>
            <div className="chat-panel__title">
              <strong>Study Buddy</strong>
              <span>
                <i className={`status-dot${aiEnabled ? '' : ' is-off'}`} />
                {aiEnabled ? 'Online' : 'Not switched on'}
              </span>
            </div>
            {messages.length > 0 && (
              <button type="button" className="chat-panel__btn" onClick={reset} title="New chat" aria-label="New chat">
                <Icon name="plus" size={18} />
              </button>
            )}
            <button type="button" className="chat-panel__btn" onClick={() => onOpenChange(false)} title="Close" aria-label="Close Study Buddy">
              <Icon name="close" size={18} />
            </button>
          </header>

          <div className="chat-panel__body" ref={listRef} aria-live="polite">
            {!aiEnabled ? (
              <div className="chat-welcome">
                <img className="chat-welcome__bird" src="/bird-480.png" alt="" width="120" height="120" />
                <p className="chat-welcome__title">AI isn't switched on yet</p>
                <p className="muted">
                  Add a <code>GEMINI_API_KEY</code> to the server's <code>.env</code> file (and to Render's
                  environment settings), then restart the server.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-welcome">
                <img className="chat-welcome__bird" src="/bird-480.png" alt="" width="120" height="120" />
                <p className="chat-welcome__title">Hi! I'm your Study Buddy.</p>
                <p className="muted">I can see your tasks and classes. What do you need help with?</p>
                <div className="starter-grid">
                  {STARTERS.map((s) => (
                    <button key={s.title} type="button" className="starter" onClick={() => applyStarter(s.prompt)}>
                      <span className="starter__icon" aria-hidden="true">{s.icon}</span>
                      <strong>{s.title}</strong>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, index) => (
                <div key={index} className={`bubble bubble--${m.role}`}>
                  {m.role === 'assistant' && <span className="chat-avatar chat-avatar--sm"><img src="/bird-128.png" alt="" width="28" height="28" /></span>}
                  <div className="bubble__body">
                    {m.role === 'assistant'
                      ? (m.content ? <Markdown text={m.content} /> : <span className="typing" aria-label="Thinking"><i /><i /><i /></span>)
                      : m.content}
                  </div>
                </div>
              ))
            )}

            {error && (
              <div className="banner banner--compact" role="alert">
                {error}
                <button type="button" onClick={clearError} aria-label="Dismiss error">{'×'}</button>
              </div>
            )}
          </div>

          {aiEnabled && (
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault()
                submit()
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    submit()
                  }
                }}
                rows={Math.min(5, Math.max(1, input.split('\n').length))}
                placeholder="Ask anything about your studies..."
                aria-label="Message Study Buddy"
                maxLength={8000}
              />
              {streaming ? (
                <button type="button" className="composer__btn composer__btn--stop" onClick={stop} aria-label="Stop answering">
                  <Icon name="stop" size={16} />
                </button>
              ) : (
                <button type="submit" className="composer__btn" disabled={!input.trim()} aria-label="Send">
                  <Icon name="send" size={16} />
                </button>
              )}
            </form>
          )}
        </section>
      )}
    </>
  )
}
