import { useEffect, useRef, useState } from 'react'
import { loadJSON, saveJSON } from '../utils'

const SETTINGS_KEY = 'awesome-todos:timer-settings'
const DEFAULT_SETTINGS = { focus: 25, short: 5, long: 15 }
// One-tap lengths (minutes) for each mode.
const PRESETS = { focus: [15, 25, 45, 60], short: [5, 10, 15], long: [15, 20, 30] }
const MODES = [
  { value: 'focus', label: 'Focus' },
  { value: 'short', label: 'Short break' },
  { value: 'long', label: 'Long break' },
]
const RING = 2 * Math.PI * 54

const formatTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

const chime = () => {
  try {
    const ctx = new AudioContext()
    ;[0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + offset
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.2, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    })
    setTimeout(() => ctx.close(), 1500)
  } catch {
    // Audio is optional.
  }
}

const notify = (message) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification("Awesome ToDo's", { body: message })
  }
}

// Pomodoro timer. Completed focus sessions are credited to the selected task.
export default function FocusTimer({ tasks, taskId, onTaskChange, onFocusComplete, onStatus }) {
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...loadJSON(SETTINGS_KEY, {}) }))
  const [mode, setMode] = useState('focus')
  const [remaining, setRemaining] = useState(settings.focus * 60)
  const [running, setRunning] = useState(false)
  const [endAt, setEndAt] = useState(0)
  const [sessions, setSessions] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const finishRef = useRef(null)

  const total = settings[mode] * 60
  const task = tasks.find((t) => t._id === taskId)

  const switchMode = (next) => {
    setRunning(false)
    setMode(next)
    setRemaining(settings[next] * 60)
  }

  const finishSession = () => {
    setRunning(false)
    chime()

    if (mode === 'focus') {
      const count = sessions + 1
      setSessions(count)
      onFocusComplete(taskId)
      notify(task ? `Focus session done for "${task.todo}". Take a break!` : 'Focus session done. Take a break!')
      switchMode(count % 4 === 0 ? 'long' : 'short')
    } else {
      notify('Break is over. Ready to focus?')
      switchMode('focus')
    }
  }

  useEffect(() => {
    finishRef.current = finishSession
  })

  useEffect(() => {
    if (!running) return undefined

    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        clearInterval(id)
        finishRef.current()
      }
    }, 250)

    return () => clearInterval(id)
  }, [running, endAt])

  useEffect(() => {
    onStatus?.({ running, remaining, mode })
  }, [onStatus, running, remaining, mode])

  useEffect(() => {
    const label = mode === 'focus' ? 'Focus' : 'Break'
    document.title = running ? `${formatTime(remaining)} · ${label}` : "Awesome ToDo's"
  }, [running, remaining, mode])

  const start = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setEndAt(Date.now() + remaining * 1000)
    setRunning(true)
  }

  const setMinutes = (key, value) => {
    const minutes = Math.min(120, Math.max(1, Number(value) || 1))
    const next = { ...settings, [key]: minutes }
    setSettings(next)
    saveJSON(SETTINGS_KEY, next)
    if (!running && key === mode) setRemaining(minutes * 60)
  }

  return (
    <section className={`panel timer timer--${mode}`} aria-label="Focus timer">
      <h2 className="panel__title">Focus timer</h2>

      <div className="timer__modes" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={mode === m.value}
            className={`tab${mode === m.value ? ' tab--active' : ''}`}
            onClick={() => switchMode(m.value)}
          >{m.label}</button>
        ))}
      </div>

      <div className="timer__presets" role="group" aria-label={`${MODES.find((m) => m.value === mode).label} length`}>
        {PRESETS[mode].map((minutes) => (
          <button
            key={minutes}
            type="button"
            className={`preset${settings[mode] === minutes ? ' is-active' : ''}`}
            onClick={() => setMinutes(mode, minutes)}
            disabled={running}
            aria-pressed={settings[mode] === minutes}
          >{minutes} min</button>
        ))}
        {!PRESETS[mode].includes(settings[mode]) && (
          <span className="preset is-active">{settings[mode]} min</span>
        )}
      </div>

      <div className="timer__dial">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="timer__track" cx="60" cy="60" r="54" />
          <circle
            className="timer__progress"
            cx="60"
            cy="60"
            r="54"
            strokeDasharray={RING}
            strokeDashoffset={RING * (remaining / total)}
          />
        </svg>
        <span className="timer__time" role="timer">{formatTime(remaining)}</span>
      </div>

      <div className="timer__controls">
        {running
          ? <button type="button" className="btn btn--primary" onClick={() => setRunning(false)}>Pause</button>
          : <button type="button" className="btn btn--primary" onClick={start}>Start</button>}
        <button type="button" className="btn btn--ghost" onClick={() => switchMode(mode)}>Reset</button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => switchMode(mode === 'focus' ? 'short' : 'focus')}
        >Skip</button>
      </div>

      <label className="field">
        <span>Working on</span>
        <select value={taskId ?? ''} onChange={(event) => onTaskChange(event.target.value || null)}>
          <option value="">No specific task</option>
          {tasks.map((t) => <option key={t._id} value={t._id}>{t.subject ? `[${t.subject}] ` : ''}{t.todo}</option>)}
        </select>
      </label>

      <p className="muted">
        Session {(sessions % 4) + 1} of 4 {'·'} long break after every 4 focus sessions
      </p>

      <button type="button" className="link-btn" onClick={() => setShowSettings((open) => !open)}>
        {showSettings ? 'Hide custom time' : 'Custom time'}
      </button>
      {showSettings && (
        <div className="timer__settings">
          {MODES.map((m) => (
            <label key={m.value} className="field">
              <span>{m.label} (min)</span>
              <input type="number" min={1} max={120} value={settings[m.value]} onChange={(event) => setMinutes(m.value, event.target.value)} />
            </label>
          ))}
        </div>
      )}
    </section>
  )
}
