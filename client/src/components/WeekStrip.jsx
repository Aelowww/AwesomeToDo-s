import { useSubjectColor } from '../subjectColors'
import { DAY_SHORT, addDays, todayISO } from '../utils'

const MAX_DOTS = 4

// Monday-to-Sunday strip for the current week, with one dot per open task due that day.
export default function WeekStrip({ todos, onOpenCalendar }) {
  const subjectColor = useSubjectColor()
  const today = todayISO()
  const offset = (new Date().getDay() + 6) % 7
  const monday = addDays(today, -offset)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  const dueOn = (day) => todos.filter((t) => !t.status && t.dueDate === day)

  return (
    <ol className="week-strip" aria-label="This week's deadlines">
      {days.map((day) => {
        const date = new Date(`${day}T12:00:00`)
        const tasks = dueOn(day)
        const label = `${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}: ${tasks.length} due`
        return (
          <li key={day}>
            <button
              type="button"
              className={`week-day${day === today ? ' is-today' : ''}${day < today ? ' is-past' : ''}`}
              onClick={onOpenCalendar}
              aria-label={label}
              title={tasks.map((t) => t.todo).join('\n') || 'Nothing due'}
            >
              <span className="week-day__name">{DAY_SHORT[date.getDay()]}</span>
              <span className="week-day__num">{date.getDate()}</span>
              <span className="week-day__dots" aria-hidden="true">
                {tasks.slice(0, MAX_DOTS).map((t) => (
                  <i key={t._id} style={{ '--dot': t.subject ? subjectColor(t.subject) : 'var(--accent)' }} />
                ))}
                {tasks.length > MAX_DOTS && <small>+{tasks.length - MAX_DOTS}</small>}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
