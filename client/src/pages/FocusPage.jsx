import FocusTimer from '../components/FocusTimer'
import PageHeader from '../components/PageHeader'
import { addDays, durationLabel, todayISO } from '../utils'

const TIPS = [
  'Put your phone in another room, or face down on silent.',
  'Write down distracting thoughts and come back to them on your break.',
  'Stand up, stretch and drink water during breaks.',
  'Pick one task per session. Small, clear goals are easier to start.',
]

export default function FocusPage({ tasks, taskId, onTaskChange, onFocusComplete, onStatus, focusLog }) {
  const today = todayISO()
  const week = Array.from({ length: 7 }, (_, i) => focusLog[addDays(today, -i)] || 0)
  const weekTotal = week.reduce((s, n) => s + n, 0)
  const tip = TIPS[new Date().getDate() % TIPS.length]

  return (
    <div className="page">
      <PageHeader title="Focus" subtitle="Pomodoro sessions: focus for 25 minutes, then take a short break." />
      <div className="focus-layout">
        <FocusTimer
          tasks={tasks}
          taskId={taskId}
          onTaskChange={onTaskChange}
          onFocusComplete={onFocusComplete}
          onStatus={onStatus}
        />
        <section className="panel">
          <h2 className="panel__title">Your focus</h2>
          <div className="stat-grid">
            <div className="stat"><strong>{focusLog[today] || 0}</strong><span>Sessions today</span></div>
            <div className="stat"><strong>{weekTotal}</strong><span>Last 7 days</span></div>
          </div>
          <p className="muted">
            {weekTotal > 0
              ? `That's about ${durationLabel(weekTotal * 25)} of deep work this week.`
              : 'Finish a focus session and it will be counted here.'}
          </p>
          <h3 className="panel__subtitle">Tip</h3>
          <p>{tip}</p>
        </section>
      </div>
    </div>
  )
}
