import { addDays, toISODate, todayISO } from '../utils'

// Tasks completed on each of the last 7 days. One series, so no legend: the title names it.
// Today is drawn in the accent; earlier days in a lighter step of the same hue.
export default function ActivityChart({ todos }) {
  const today = todayISO()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const counts = Object.fromEntries(days.map((d) => [d, 0]))
  for (const t of todos) {
    if (!t.completedAt) continue
    const day = toISODate(new Date(t.completedAt))
    if (day in counts) counts[day] += 1
  }

  const values = days.map((d) => counts[d])
  const total = values.reduce((sum, n) => sum + n, 0)
  const max = Math.max(3, ...values)

  return (
    <div className="activity">
      <div className="activity__head">
        <span className="activity__total">{total}</span>
        <span className="muted">task{total === 1 ? '' : 's'} completed in the last 7 days</span>
      </div>

      <ol className="activity__chart" aria-label="Tasks completed per day, last 7 days">
        {days.map((day) => {
          const value = counts[day]
          const date = new Date(`${day}T12:00:00`)
          const isToday = day === today
          const name = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
          const tip = `${isToday ? 'Today' : name}: ${value} task${value === 1 ? '' : 's'}`
          return (
            <li key={day} className={`activity__col${isToday ? ' is-today' : ''}`}>
              <span className="activity__plot">
                {isToday && value > 0 && <span className="activity__value">{value}</span>}
                <span
                  className={`activity__bar${value === 0 ? ' is-empty' : ''}`}
                  style={{ height: value === 0 ? undefined : `${(value / max) * 100}%` }}
                  tabIndex={0}
                  aria-label={tip}
                  data-tip={tip}
                />
              </span>
              <span className="activity__day" aria-hidden="true">
                {isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
