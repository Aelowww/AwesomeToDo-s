import Icon from './Icon'
import { useSubjectColor } from '../subjectColors'
import { daysUntil, dueLabel, toISODate, todayISO, typeInfo } from '../utils'

// Four headline numbers for today, each with an icon and a label.
export function StatTiles({ todos, focusLog }) {
  const today = todayISO()
  const open = todos.filter((t) => !t.status && t.dueDate)
  const tiles = [
    { key: 'due', icon: 'calendar', label: 'Due today', value: open.filter((t) => daysUntil(t.dueDate) === 0).length },
    { key: 'overdue', icon: 'alert', label: 'Overdue', value: open.filter((t) => daysUntil(t.dueDate) < 0).length },
    { key: 'done', icon: 'checkCircle', label: 'Done today', value: todos.filter((t) => t.completedAt && toISODate(new Date(t.completedAt)) === today).length },
    { key: 'focus', icon: 'focus', label: 'Focus today', value: focusLog[today] || 0 },
  ]

  return (
    <ul className="stat-tiles" aria-label="Today at a glance">
      {tiles.map((t) => (
        <li key={t.key} className={`stat-tile stat-tile--${t.key}${t.key === 'overdue' && t.value > 0 ? ' is-alert' : ''}`}>
          <span className="stat-tile__icon" aria-hidden="true"><Icon name={t.icon} size={18} /></span>
          <strong className="stat-tile__value">{t.value}</strong>
          <span className="stat-tile__label">{t.label}</span>
        </li>
      ))}
    </ul>
  )
}

// Countdown cards for the next exams, assignments and projects.
export function DeadlineCards({ todos, onOpen }) {
  const subjectColor = useSubjectColor()
  const deadlines = todos
    .filter((t) => !t.status && t.dueDate && ['exam', 'assignment', 'project'].includes(t.type) && daysUntil(t.dueDate) >= 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6)

  if (deadlines.length === 0) {
    return <p className="muted">No exams, assignments or projects coming up.</p>
  }

  return (
    <ul className="countdowns">
      {deadlines.map((t) => {
        const days = daysUntil(t.dueDate)
        return (
          <li key={t._id}>
            <button
              type="button"
              className={`countdown${days <= 1 ? ' is-soon' : ''}`}
              style={{ '--chip-color': t.subject ? subjectColor(t.subject) : 'var(--accent)' }}
              onClick={onOpen}
            >
              <span className="countdown__days">
                <strong>{days === 0 ? 'Today' : days}</strong>
                {days > 0 && <small>day{days === 1 ? '' : 's'} left</small>}
              </span>
              <span className="countdown__type" aria-hidden="true">{typeInfo(t.type).icon}</span>
              <span className="countdown__title">{t.todo}</span>
              <span className="countdown__meta">{t.subject || typeInfo(t.type).label} · {dueLabel(t.dueDate).replace(/^Due /, '')}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
