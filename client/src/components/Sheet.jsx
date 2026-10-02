import { useEffect } from 'react'
import Icon from './Icon'

// A panel for one settings task: a bottom sheet on phones, a centered dialog on larger screens.
export default function Sheet({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div className="sheet" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet__panel" role="dialog" aria-modal="true" aria-label={title}>
        <span className="sheet__grabber" aria-hidden="true" />
        <header className="sheet__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button type="button" className="chat-panel__btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
      </section>
    </div>
  )
}
