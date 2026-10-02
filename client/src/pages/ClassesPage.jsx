import { useState } from 'react'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import Sheet from '../components/Sheet'
import SubTabs from '../components/SubTabs'
import {
  CLASS_COLORS,
  DAY_NAMES,
  DAY_SHORT,
  WEEK_ORDER,
  sessionsOn,
  timeLabel,
} from '../utils'

const VIEW_TABS = [
  { page: 'classes', label: 'Schedule', icon: 'classes' },
  { page: 'grades', label: 'Grades', icon: 'grades' },
]

const EMPTY_CLASS = { name: '', code: '', teacher: '', room: '', color: 'violet', meetings: [] }

function ClassForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  const setMeeting = (index, key, value) =>
    setForm({ ...form, meetings: form.meetings.map((m, i) => (i === index ? { ...m, [key]: value } : m)) })

  const addMeeting = () => {
    const last = form.meetings[form.meetings.length - 1]
    // Most classes repeat at the same time, so copy the previous slot onto the next weekday.
    const next = last
      ? { ...last, day: (last.day % 6) + 1 }
      : { day: 1, start: '08:00', end: '09:30' }
    setForm({ ...form, meetings: [...form.meetings, next] })
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    const ok = await onSave({
      name: form.name,
      code: form.code,
      teacher: form.teacher,
      room: form.room,
      color: form.color,
      meetings: form.meetings.map((m) => ({ ...m, day: Number(m.day) })),
    })
    setBusy(false)
    if (ok) onCancel()
  }

  return (
    <form className="panel class-form" onSubmit={submit}>
      <h2 className="panel__title">{initial._id ? 'Edit class' : 'New class'}</h2>

      <div className="class-form__grid">
        <label className="field field--wide">
          <span>Class name *</span>
          <input value={form.name} onChange={set('name')} placeholder="e.g. General Biology" maxLength={80} required autoFocus />
        </label>
        <label className="field">
          <span>Code / section</span>
          <input value={form.code} onChange={set('code')} placeholder="BIO 101" maxLength={30} />
        </label>
        <label className="field">
          <span>Teacher</span>
          <input value={form.teacher} onChange={set('teacher')} placeholder="Ms. Santos" maxLength={80} />
        </label>
        <label className="field">
          <span>Room</span>
          <input value={form.room} onChange={set('room')} placeholder="Rm 204" maxLength={40} />
        </label>
      </div>

      <fieldset className="swatches">
        <legend>Color</legend>
        {Object.entries(CLASS_COLORS).map(([name, hex]) => (
          <label key={name} className="swatch" style={{ '--swatch': hex }}>
            <input type="radio" name="color" value={name} checked={form.color === name} onChange={set('color')} />
            <span className="sr-only">{name}</span>
          </label>
        ))}
      </fieldset>

      <div className="meetings">
        <h3 className="panel__subtitle">Meets on</h3>
        {form.meetings.length === 0 && <p className="muted">Add the days and times this class meets.</p>}
        {form.meetings.map((m, index) => (
          <div key={index} className="meeting-row">
            <select value={m.day} onChange={(e) => setMeeting(index, 'day', Number(e.target.value))} aria-label="Day">
              {WEEK_ORDER.map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
            </select>
            <input type="time" value={m.start} onChange={(e) => setMeeting(index, 'start', e.target.value)} aria-label="Starts" required />
            <span className="muted">to</span>
            <input type="time" value={m.end} onChange={(e) => setMeeting(index, 'end', e.target.value)} aria-label="Ends" required />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setForm({ ...form, meetings: form.meetings.filter((_, i) => i !== index) })}
              aria-label="Remove meeting time"
            ><Icon name="close" size={16} /></button>
          </div>
        ))}
        <button type="button" className="btn btn--ghost" onClick={addMeeting}>
          <Icon name="plus" size={16} /> Add day & time
        </button>
      </div>

      <div className="edit__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving...' : 'Save class'}</button>
      </div>
    </form>
  )
}

export default function ClassesPage({ page, onNavigate, classes, onCreate, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null)
  const [managing, setManaging] = useState(false)
  const todayDay = new Date().getDay()

  // Hide Saturday and Sunday unless a class meets then.
  const days = WEEK_ORDER.filter((d) => (d !== 0 && d !== 6) || sessionsOn(classes, d).length > 0)

  const save = (fields) => (editing._id ? onUpdate(editing._id, fields) : onCreate(fields))

  // Opens the class form at the top of the page (closing the Edit classes list first).
  const edit = (cls) => {
    setManaging(false)
    setEditing(cls)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="page">
      <PageHeader title="Classes" subtitle="Your weekly schedule. Class names also show up as task subjects.">
        {!editing && classes.length > 0 && (
          <button type="button" className="btn btn--ghost" onClick={() => setManaging(true)}>
            <Icon name="edit" size={16} /> Edit classes
          </button>
        )}
        {!editing && (
          <button type="button" className="btn btn--primary" onClick={() => setEditing(EMPTY_CLASS)}>
            <Icon name="plus" size={16} /> Add class
          </button>
        )}
      </PageHeader>
      <SubTabs items={VIEW_TABS} page={page} onNavigate={onNavigate} label="Class views" />

      {editing && <ClassForm key={editing._id ?? 'new'} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}

      {classes.length === 0 && !editing ? (
        <div className="empty">
          <p className="empty__title">No classes yet</p>
          <p>Add your subjects with their days and times to build your timetable.</p>
          <button type="button" className="btn btn--primary" onClick={() => setEditing(EMPTY_CLASS)}>
            <Icon name="plus" size={16} /> Add your first class
          </button>
        </div>
      ) : (
        <>
          <section className="panel timetable-panel">
            <h2 className="panel__title">This week</h2>
            <div className="timetable" style={{ '--days': days.length }}>
              {days.map((d) => {
                const sessions = sessionsOn(classes, d)
                return (
                  <div key={d} className={`timetable__day${d === todayDay ? ' is-today' : ''}`}>
                    <h3>{DAY_SHORT[d]}</h3>
                    <div className="timetable__slots">
                      {sessions.length === 0 && <p className="timetable__free">Free</p>}
                      {sessions.map((s) => (
                        <button
                          key={`${s.cls._id}-${s.start}`}
                          type="button"
                          className="slot"
                          style={{ '--class-color': CLASS_COLORS[s.cls.color] }}
                          onClick={() => edit(s.cls)}
                        >
                          <span className="slot__time">{timeLabel(s.start)} - {timeLabel(s.end)}</span>
                          <strong>{s.cls.name}</strong>
                          {s.cls.room && <span className="slot__room">{s.cls.room}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}

      {managing && (
        <Sheet title="Edit classes" subtitle="Change a class's details and times, or remove it." onClose={() => setManaging(false)}>
          <ul className="class-cards">
            {classes.map((c) => (
              <li key={c._id} className="class-card" style={{ '--class-color': CLASS_COLORS[c.color] }}>
                <div className="class-card__top">
                  <div>
                    <strong className="class-card__name">{c.name}</strong>
                    {c.code && <span className="class-card__code">{c.code}</span>}
                  </div>
                  <div className="mutations">
                    <button type="button" className="icon-btn" onClick={() => edit(c)} aria-label={`Edit ${c.name}`}><Icon name="edit" size={16} /></button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => onDelete(c._id)}
                      aria-label={`Delete ${c.name}`}
                    ><Icon name="trash" size={16} /></button>
                  </div>
                </div>
                <div className="class-card__meta">
                  {c.teacher && <span>{c.teacher}</span>}
                  {c.room && <span><Icon name="pin" size={14} /> {c.room}</span>}
                </div>
                <div className="class-card__times">
                  {c.meetings.length === 0
                    ? <span className="muted">No times set</span>
                    : c.meetings
                      .slice()
                      .sort((a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day))
                      .map((m, i) => <span key={i} className="chip">{DAY_SHORT[m.day]} {timeLabel(m.start)}</span>)}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--ghost" onClick={() => edit(EMPTY_CLASS)}>
            <Icon name="plus" size={16} /> Add another class
          </button>
        </Sheet>
      )}
    </div>
  )
}
