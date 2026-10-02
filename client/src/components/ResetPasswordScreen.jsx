import { useState } from 'react'
import { auth } from '../api'
import PasswordInput from './PasswordInput'

// Opened from the emailed link (/?reset=TOKEN). Sets a new password and signs the student in.
export default function ResetPasswordScreen({ token, onDone, onCancel }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    if (password.length < 8) return setError('Your new password needs at least 8 characters.')
    if (password !== confirm) return setError("The passwords don't match.")
    setBusy(true)
    setError('')
    try {
      onDone(await auth.resetPassword(token, password))
    } catch (err) {
      setError(err.message)
      setExpired(err.status === 400 && /invalid|expired/i.test(err.message))
      setBusy(false)
    }
  }

  return (
    <main className="auth auth--single">
      <section className="auth__card">
        <div className="brand brand--center">
          <img className="brand__logo" src="/logo-192.png" alt="" width="40" height="40" />
          <span className="brand__name">Awesome ToDo's</span>
        </div>
        <header className="auth__head">
          <h1>Choose a new password</h1>
          <p>Pick something you haven't used before. You'll be signed in right after.</p>
        </header>
        <form className="auth__form" onSubmit={submit} noValidate>
          <PasswordInput label="New password" value={password} onChange={setPassword} autoComplete="new-password" showStrength placeholder="At least 8 characters" />
          <PasswordInput label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && (
            <div className="auth__error" role="alert">
              <span>{error}</span>
              {expired && <button type="button" className="link-btn" onClick={onCancel}>Request a new link</button>}
            </div>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {busy ? 'Saving...' : 'Save password and sign in'}
          </button>
          <button type="button" className="link-btn forgot__back" onClick={onCancel}>Back to sign in</button>
        </form>
      </section>
    </main>
  )
}
