import { useState } from 'react'
import { auth } from '../api'

// "Forgot password?": first asks the student to contact their admin; resetting by email is the fallback.
export default function ForgotPassword({ initialEmail, onBack }) {
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [useEmail, setUseEmail] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      setResult(await auth.forgotPassword(email.trim().toLowerCase()))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!useEmail) {
    return (
      <div className="forgot">
        <img className="forgot__bird" src="/bird-128.png" alt="" width="88" height="88" />
        <header className="auth__head">
          <h1>Forgot your password?</h1>
          <p>Please contact your admin (your teacher, or whoever set up Awesome ToDo's for your class) and they'll help you get back in.</p>
        </header>
        <button type="button" className="btn btn--primary btn--block" onClick={onBack}>Back to sign in</button>
        <button type="button" className="link-btn forgot__back" onClick={() => setUseEmail(true)}>
          Can't reach your admin? Reset by email
        </button>
      </div>
    )
  }

  if (result) {
    return (
      <div className="forgot">
        <img className="forgot__bird" src="/bird-128.png" alt="" width="88" height="88" />
        <header className="auth__head">
          <h1>{result.devResetUrl ? 'Your reset link' : 'Check your email'}</h1>
          <p>{result.mssg}</p>
        </header>
        {result.devResetUrl && (
          <a className="btn btn--primary btn--block" href={result.devResetUrl}>Choose a new password</a>
        )}
        <button type="button" className="btn btn--ghost btn--block" onClick={onBack}>Back to sign in</button>
      </div>
    )
  }

  return (
    <form className="auth__form forgot" onSubmit={submit} noValidate>
      <header className="auth__head">
        <h1>Forgot your password?</h1>
        <p>Enter your account email and we'll send you a link to choose a new one.</p>
      </header>
      <label className="field">
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@school.edu" required autoFocus />
      </label>
      {error && <div className="auth__error" role="alert"><span>{error}</span></div>}
      <button type="submit" className="btn btn--primary btn--block" disabled={busy || !email.trim()}>
        {busy && <span className="spinner" aria-hidden="true" />}
        {busy ? 'Sending...' : 'Send reset link'}
      </button>
      <button type="button" className="link-btn forgot__back" onClick={onBack}>Back to sign in</button>
    </form>
  )
}
