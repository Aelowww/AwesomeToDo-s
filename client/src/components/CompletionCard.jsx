import { useEffect } from 'react'

const CHEERS = ['Nice work', 'Awesome job', 'Way to go', 'Great job', 'You did it']

// The "Task complete!" pop-up shown after a task is marked done.
export default function CompletionCard({ completion, firstName, onUndo, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 3200)
    return () => clearTimeout(id)
  }, [completion, onClose])

  const cheer = CHEERS[completion.id % CHEERS.length]

  return (
    <div className="completion" role="status" aria-live="polite">
      <img className="completion__bird" src="/bird-128.png" alt="" width="64" height="64" />
      <div className="completion__text">
        <strong>Task complete!</strong>
        <span className="completion__task">{completion.task.todo}</span>
        <span className="completion__cheer">{cheer}, {firstName}! {'\u{1F389}'}</span>
      </div>
      <div className="completion__actions">
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            onUndo()
            onClose()
          }}
        >Undo</button>
        <button type="button" className="toast__close" onClick={onClose} aria-label="Dismiss">{'×'}</button>
      </div>
    </div>
  )
}
