import { PRIORITIES, TYPES, addDays, todayISO } from '../utils'

// Shared subject / type / priority / due date inputs for creating and editing tasks.
export default function TaskFields({ value, onChange, subjects, idPrefix }) {
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value })
  const setDue = (dueDate) => onChange({ ...value, dueDate })
  const today = todayISO()

  return (
    <div className="fields">
      <label className="field">
        <span>Subject</span>
        <input
          type="text"
          list={`${idPrefix}-subjects`}
          value={value.subject}
          onChange={set('subject')}
          placeholder="e.g. Biology"
          maxLength={60}
        />
        <datalist id={`${idPrefix}-subjects`}>
          {subjects.map((subject) => <option key={subject} value={subject} />)}
        </datalist>
      </label>

      <label className="field">
        <span>Type</span>
        <select value={value.type} onChange={set('type')}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Priority</span>
        <select value={value.priority} onChange={set('priority')}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Due date</span>
        <input
          type="date"
          value={value.dueDate ?? ''}
          onChange={(event) => setDue(event.target.value || null)}
        />
      </label>

      <div className="quick-dates" aria-label="Quick due dates">
        <button type="button" onClick={() => setDue(today)}>Today</button>
        <button type="button" onClick={() => setDue(addDays(today, 1))}>Tomorrow</button>
        <button type="button" onClick={() => setDue(addDays(today, 7))}>In a week</button>
        {value.dueDate && <button type="button" onClick={() => setDue(null)}>No date</button>}
      </div>
    </div>
  )
}
