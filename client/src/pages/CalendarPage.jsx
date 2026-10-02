import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import SubTabs from '../components/SubTabs'
import TaskForm from '../components/TaskForm'
import { useSubjectColor } from '../subjectColors'
import { DAY_SHORT, WEEK_ORDER, toISODate, todayISO, typeInfo } from '../utils'

const MAX_CHIPS = 3

const VIEW_TABS = [
  { page: 'tasks', label: 'List', icon: 'list' },
  { page: 'calendar', label: 'Calendar', icon: 'calendar' },
]


export default function CalendarPage({ page, onNavigate, todos, subjects, onAdd, onUpdate }) {
  const subjectColor = useSubjectColor()
  const today = todayISO()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState(today)

  const byDate = useMemo(() => {
    const map = {}
    for (const t of todos) {
      if (!t.dueDate) continue
      ;(map[t.dueDate] ??= []).push(t)
    }
    return map
  }, [todos])

  // Monday-first grid that covers the whole month.
  const cells = useMemo(() => {
    const offset = (month.getDay() + 6) % 7
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const total = Math.ceil((offset + daysInMonth) / 7) * 7
    return Array.from({ length: total }, (_, i) => {
      const date = new Date(month.getFullYear(), month.getMonth(), i - offset + 1)
      return { iso: toISODate(date), day: date.getDate(), inMonth: date.getMonth() === month.getMonth() }
    })
  }, [month])

  const shiftMonth = (delta) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  const goToday = () => {
    const d = new Date()
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    setSelected(today)
  }

  const selectedDate = new Date(`${selected}T12:00:00`)
  const selectedTasks = (byDate[selected] ?? []).slice().sort((a, b) => Number(a.status) - Number(b.status))

  return (
    <div className="page">
      <PageHeader title="Tasks" subtitle="See every deadline at a glance. Tap a day to plan it." />
      <SubTabs items={VIEW_TABS} page={page} onNavigate={onNavigate} label="Task views" />

      <div className="calendar-layout">
        <section className="panel calendar">
          <div className="calendar__head">
            <h2 className="panel__title">
              {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
            <div className="calendar__nav">
              <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month"><Icon name="left" size={18} /></button>
              <button type="button" className="btn btn--ghost" onClick={goToday}>Today</button>
              <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month"><Icon name="right" size={18} /></button>
            </div>
          </div>

          <div className="calendar__grid" role="grid">
            {WEEK_ORDER.map((d) => <div key={d} className="calendar__weekday" role="columnheader">{DAY_SHORT[d]}</div>)}
            {cells.map((cell) => {
              const tasks = byDate[cell.iso] ?? []
              const openCount = tasks.filter((t) => !t.status).length
              return (
                <button
                  key={cell.iso}
                  type="button"
                  role="gridcell"
                  className={[
                    'calendar__cell',
                    !cell.inMonth && 'is-outside',
                    cell.iso === today && 'is-today',
                    cell.iso === selected && 'is-selected',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelected(cell.iso)}
                  aria-label={`${cell.iso}, ${openCount} open task${openCount === 1 ? '' : 's'}`}
                  aria-selected={cell.iso === selected}
                >
                  <span className="calendar__day">{cell.day}</span>
                  <span className="calendar__chips">
                    {tasks.slice(0, MAX_CHIPS).map((t) => (
                      <span
                        key={t._id}
                        className={`cal-chip${t.status ? ' is-done' : ''}`}
                        style={{ '--chip-color': t.subject ? subjectColor(t.subject) : '#b18cff' }}
                      >
                        {t.todo}
                      </span>
                    ))}
                    {tasks.length > MAX_CHIPS && <span className="cal-more">+{tasks.length - MAX_CHIPS}</span>}
                  </span>
                  {openCount > 0 && <span className="calendar__dot" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </section>

        <section className="panel day-panel">
          <h2 className="panel__title">
            {selected === today ? 'Today' : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h2>

          <h3 className="panel__subtitle">Due</h3>
          {selectedTasks.length === 0 ? (
            <p className="muted">Nothing due this day.</p>
          ) : (
            <ul className="mini-tasks">
              {selectedTasks.map((t) => (
                <li key={t._id} className={`mini-task${t.status ? ' is-done' : ''}`}>
                  <input
                    type="checkbox"
                    className="todo__status"
                    checked={t.status}
                    onChange={() => onUpdate(t._id, { status: !t.status })}
                    aria-label={`Mark ${t.todo} done`}
                  />
                  <span className="mini-task__body">
                    <span>{t.todo}</span>
                    <small>{typeInfo(t.type).icon} {t.subject || typeInfo(t.type).label}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h3 className="panel__subtitle">Add for this day</h3>
          <TaskForm key={selected} onAdd={onAdd} subjects={subjects} compact defaultDueDate={selected} />
        </section>
      </div>
    </div>
  )
}
