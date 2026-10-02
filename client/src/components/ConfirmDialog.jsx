import { useEffect, useRef } from 'react'

// A friendly "are you sure?" dialog. Enter confirms, Escape cancels.
export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', image, onResolve }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') onResolve(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onResolve])

  return (
    <div className="confirm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onResolve(false)}>
      <div className="confirm__card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        {image && <img className="confirm__image" src={image} alt="" width="96" height="96" />}
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>
        <div className="confirm__actions">
          <button type="button" className="btn btn--ghost" onClick={() => onResolve(false)}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => onResolve(true)}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
