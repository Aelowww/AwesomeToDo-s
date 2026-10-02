import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'

export default function AccountMenu({ user, onSignOut, onProfile, placement = 'down' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`account account--${placement}`} ref={rootRef}>
      <button type="button" className="account__trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu">
        {/* The photo only shows on the Profile page; here we use initials. */}
        <Avatar user={{ ...user, avatar: null }} size={32} />
        <span className="account__name">{user.name}</span>
      </button>
      {open && (
        <div className="account__menu" role="menu">
          <div className="account__who">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button
            type="button"
            role="menuitem"
            className="account__item"
            onClick={() => {
              setOpen(false)
              onProfile()
            }}
          >Profile & settings</button>
          <button type="button" role="menuitem" className="account__item account__item--danger" onClick={onSignOut}>Sign out</button>
        </div>
      )}
    </div>
  )
}
