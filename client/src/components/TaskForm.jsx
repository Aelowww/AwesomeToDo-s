import { forwardRef, useState } from 'react'
import TaskFields from './TaskFields'

const EMPTY_DETAILS = { subject: '', type: 'task', priority: 'medium', dueDate: null }

const TaskForm = forwardRef(function TaskForm({ onAdd, subjects, compact, defaultDueDate = null }, inputRef) {
  const [todo, setTodo] = useState('')
  const [details, setDetails] = useState({ ...EMPTY_DETAILS, dueDate: defaultDueDate })
  const [showDetails, setShowDetails] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!todo.trim()) {
      return
    }

    const ok = await onAdd({ todo: todo.trim(), ...details })
    if (ok) {
      // Start fresh for the next task: clear the text, reset the details and close the panel.
      setTodo('')
      setDetails({ ...EMPTY_DETAILS, dueDate: defaultDueDate })
      setShowDetails(false)
    }
  }

  return (
    <form className={`form${compact ? ' form--compact' : ''}`} onSubmit={handleSubmit}>
      <div className="form__row">
        <input
          ref={inputRef}
          className="form__input"
          type="text"
          value={todo}
          onChange={(event) => setTodo(event.target.value)}
          placeholder={compact ? 'Quick add a task...' : 'Add a new task...'}
          aria-label="New task"
          maxLength={300}
        />
        <button
          className="form__toggle"
          type="button"
          onClick={() => setShowDetails((open) => !open)}
          aria-expanded={showDetails}
        >{showDetails ? 'Hide details' : 'Details'}</button>
        <button className="form__button" type="submit">{compact ? 'Add' : 'Create To Do'}</button>
      </div>

      {showDetails && (
        <TaskFields value={details} onChange={setDetails} subjects={subjects} idPrefix="new" />
      )}
    </form>
  )
})

export default TaskForm
