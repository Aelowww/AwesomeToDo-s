import { useState } from 'react'
import Icon from './Icon'
import TaskFields from './TaskFields'
import { useSubjectColor } from '../subjectColors'
import { dueLabel, dueTone, newId, typeInfo } from '../utils'

export default function TaskItem({ item, subjects, onUpdate, onDelete, onFocus, isFocused, onBreakdown }) {
  const subjectColor = useSubjectColor()
  const [aiBusy, setAiBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [notes, setNotes] = useState(item.notes)
  const [newStep, setNewStep] = useState('')

  const type = typeInfo(item.type)
  const stepsDone = item.subtasks.filter((s) => s.done).length
  const tone = dueTone(item.dueDate, item.status)

  const startEditing = () => {
    setDraft({
      todo: item.todo,
      subject: item.subject,
      type: item.type,
      priority: item.priority,
      dueDate: item.dueDate,
    })
    setEditing(true)
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    if (!draft.todo.trim()) return
    const ok = await onUpdate(item._id, { ...draft, todo: draft.todo.trim() })
    if (ok) setEditing(false)
  }

  const saveNotes = () => {
    if (notes !== item.notes) onUpdate(item._id, { notes })
  }

  const setSubtasks = (subtasks) => onUpdate(item._id, { subtasks })

  const breakDown = async () => {
    setAiBusy(true)
    await onBreakdown(item)
    setAiBusy(false)
  }

  const addStep = (event) => {
    event.preventDefault()
    if (!newStep.trim()) return
    setSubtasks([...item.subtasks, { id: newId(), text: newStep.trim(), done: false }])
    setNewStep('')
  }

  if (editing) {
    return (
      <li className="todo todo--editing">
        <form className="edit" onSubmit={saveEdit}>
          <input
            className="form__input"
            type="text"
            value={draft.todo}
            onChange={(event) => setDraft({ ...draft, todo: event.target.value })}
            maxLength={300}
            autoFocus
            aria-label="Task text"
          />
          <TaskFields value={draft} onChange={setDraft} subjects={subjects} idPrefix={`edit-${item._id}`} />
          <div className="edit__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save</button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className={`todo priority-${item.priority}${item.status ? ' todo--done' : ''}${isFocused ? ' todo--focused' : ''}${expanded ? ' is-expanded' : ''}`}>
      <div className="todo__main">
        <input
          className="todo__status"
          type="checkbox"
          checked={item.status}
          onChange={() => onUpdate(item._id, { status: !item.status })}
          aria-label="Toggle todo status"
        />

        <button
          type="button"
          className="todo__body"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          <span className="todo__text">{item.todo}</span>
          <span className="todo__meta">
            {item.subject && (
              <span className="chip chip--subject" style={{ '--chip-color': subjectColor(item.subject) }}>
                {item.subject}
              </span>
            )}
            {item.type !== 'task' && <span className="chip">{type.icon} {type.label}</span>}
            {item.priority === 'high' && <span className="chip chip--high">High priority</span>}
            {item.dueDate && <span className={`chip chip--due ${tone}`}>{dueLabel(item.dueDate)}</span>}
            {item.subtasks.length > 0 && <span className="chip">{'☑'} {stepsDone}/{item.subtasks.length}</span>}
            {item.pomodoros > 0 && <span className="chip">{'\u{1F345}'} {item.pomodoros}</span>}
            {item.notes && <span className="chip">{'✎'} Notes</span>}
          </span>
        </button>

        <div className="mutations">
          {!item.status && (
            <button
              className={`icon-btn${isFocused ? ' icon-btn--active' : ''}`}
              type="button"
              onClick={() => onFocus(isFocused ? null : item._id)}
              aria-label={isFocused ? 'Stop focusing on this task' : 'Focus on this task'}
              title={isFocused ? 'Stop focusing on this task' : 'Focus on this task'}
            ><Icon name="focus" size={17} /></button>
          )}
          <button
            className="icon-btn"
            type="button"
            onClick={startEditing}
            aria-label="Edit todo"
            title="Edit"
          ><Icon name="edit" size={17} /></button>
          <button
            className="icon-btn icon-btn--danger"
            type="button"
            onClick={() => onDelete(item._id)}
            aria-label="Delete todo"
            title="Delete"
          ><Icon name="trash" size={17} /></button>
        </div>
      </div>

      {expanded && (
        <div className="todo__details">
          <div className="steps">
            <div className="steps__head">
              <h3>Steps</h3>
              {onBreakdown && !item.status && (
                <button type="button" className="ai-btn" onClick={breakDown} disabled={aiBusy}>
                  {aiBusy ? 'Thinking...' : '✨ Break down with AI'}
                </button>
              )}
            </div>
            {item.subtasks.length > 0 && (
              <ul className="steps__list">
                {item.subtasks.map((step) => (
                  <li key={step.id} className={step.done ? 'step step--done' : 'step'}>
                    <label>
                      <input
                        type="checkbox"
                        checked={step.done}
                        onChange={() => setSubtasks(item.subtasks.map((s) => (
                          s.id === step.id ? { ...s, done: !s.done } : s
                        )))}
                      />
                      <span>{step.text}</span>
                    </label>
                    <button
                      type="button"
                      className="step__remove"
                      onClick={() => setSubtasks(item.subtasks.filter((s) => s.id !== step.id))}
                      aria-label={`Remove step ${step.text}`}
                    >{'×'}</button>
                  </li>
                ))}
              </ul>
            )}
            <form className="steps__add" onSubmit={addStep}>
              <input
                type="text"
                value={newStep}
                onChange={(event) => setNewStep(event.target.value)}
                placeholder="Break it down: add a step..."
                maxLength={200}
              />
              <button type="submit" className="btn btn--ghost">Add</button>
            </form>
          </div>

          <div className="notes">
            <h3>Notes</h3>
            <textarea
              aria-label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={saveNotes}
              placeholder="Links, page numbers, rubric details... (saves when you click away)"
              rows={3}
              maxLength={5000}
            />
          </div>
        </div>
      )}
    </li>
  )
}
