import { useEffect } from 'react'

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, toast.action ? 6000 : 3500)
    return () => clearTimeout(id)
  }, [toast, onClose])

  return (
    <div className={`toast${toast.tone === 'error' ? ' toast--error' : ''}`} role="status">
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            toast.action.onClick()
            onClose()
          }}
        >{toast.action.label}</button>
      )}
      <button type="button" className="toast__close" onClick={onClose} aria-label="Dismiss">{'×'}</button>
    </div>
  )
}
