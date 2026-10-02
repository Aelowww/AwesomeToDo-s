import { useState } from 'react'
import { auth } from '../api'
import { loadJSON, saveJSON } from '../utils'
import ForgotPassword from './ForgotPassword'

const LAST_EMAIL_KEY = 'awesome-todos:last-email'

const MODES = {
  login: { title: 'Welcome back!', subtitle: 'Sign in to see your tasks and deadlines.', submit: 'Sign in', busy: 'Signing in...' },
  register: { title: 'Create your account', subtitle: 'Free, private, and made for students.', submit: 'Create account', busy: 'Creating account...' },
}

const HIGHLIGHTS = [
  { icon: '\u{1F4DA}', text: 'Classes, deadlines and grades in one place' },
  { icon: '\u{1F345}', text: 'Focus timer to beat procrastination' },
  { icon: '\u{1F426}', text: 'Study Buddy AI that knows your schedule' },
]

export default function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(() => ({ name: '', email: loadJSON(LAST_EMAIL_KEY, ''), password: '', confirm: '' }))
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)
  const copy = MODES[mode]

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    if (error) setError(null)
  }

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    setForm((current) => ({ ...current, password: '', confirm: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return

    const email = form.email.trim().toLowerCase()
    const name = form.name.trim()
    if (mode === 'register' && !name) {
      setError({ message: 'Please enter your name.' })
      return
    }
    if (mode === 'register' && form.password.length < 8) {
      setError({ message: 'Your password needs at least 8 characters.' })
      return
    }
    if (mode === 'register' && form.password !== form.confirm) {
      setError({ message: "The passwords don't match. Please retype them." })
      return
    }

    setError(null)
    setBusy(true)
    try {
      const user = mode === 'login'
        ? await auth.login(email, form.password)
        : await auth.register(name, email, form.password)
      saveJSON(LAST_EMAIL_KEY, email)
      onSignedIn(user, { isNew: mode === 'register' })
    } catch (err) {
      // An existing account on sign-up: offer to switch to sign in with the same email.
      setError({ message: err.message, suggestLogin: err.status === 409 })
      setBusy(false)
    }
  }

  const checkCapsLock = (event) => setCapsLock(Boolean(event.getModifierState?.('CapsLock')))

  return (
    <main className="auth">
      <section className="auth__intro" aria-hidden="true">
        <img className="auth__mascot" src="/logo-480.png" alt="" width="220" height="220" />
        <p className="auth__appname">Awesome ToDo's</p>
        <h2 className="auth__tagline">Plan smarter.<br />Stress less.</h2>
        <ul className="auth__highlights">
          {HIGHLIGHTS.map((h, i) => (
            <li key={h.text} style={{ '--i': i }}><span>{h.icon}</span>{h.text}</li>
          ))}
        </ul>
      </section>

      <section className="auth__card">
        <div className="brand brand--center auth__brand">
          <img className="brand__logo" src="/logo-192.png" alt="" width="40" height="40" />
          <span className="brand__name">Awesome ToDo's</span>
        </div>

        {forgot ? (
          <ForgotPassword initialEmail={form.email} onBack={() => setForgot(false)} />
        ) : (
          <>
            <div className={`auth__tabs is-${mode}`} role="tablist">
              <span className="auth__tabs-indicator" aria-hidden="true" />
              <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => switchMode('register')}>Create account</button>
            </div>

            <header className="auth__head" key={mode}>
              <h1>{copy.title}</h1>
              <p>{copy.subtitle}</p>
            </header>

            <form className="auth__form" onSubmit={submit} noValidate>
              {mode === 'register' && (
                <label className="field field--appear">
                  Name
                  <input value={form.name} onChange={update('name')} autoComplete="name" maxLength={60} placeholder="What should we call you?" required autoFocus />
                </label>
              )}
              <label className="field">
                Email
                <input type="email" value={form.email} onChange={update('email')} autoComplete="email" placeholder="you@school.edu" required />
              </label>
              <label className="field">
                Password
                <span className="password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={update('password')}
                    onKeyUp={checkCapsLock}
                    onKeyDown={checkCapsLock}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                    required
                  />
                  <button type="button" className="password__toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
                {capsLock && <small className="field__hint field__hint--warn">Caps Lock is on</small>}
              </label>
              {mode === 'register' && (
                <label className="field field--appear">
                  Confirm password
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={update('confirm')}
                    autoComplete="new-password"
                    placeholder="Retype your password"
                    required
                  />
                  {form.confirm && form.confirm !== form.password && (
                    <small className="field__hint field__hint--warn">Passwords don't match yet</small>
                  )}
                </label>
              )}
              {mode === 'login' && (
                <button type="button" className="link-btn auth__forgot" onClick={() => setForgot(true)}>Forgot password?</button>
              )}

              {error && (
                <div className="auth__error" role="alert">
                  <span>{error.message}</span>
                  {error.suggestLogin && (
                    <button type="button" className="link-btn" onClick={() => switchMode('login')}>Sign in instead</button>
                  )}
                </div>
              )}

              <button type="submit" className={`btn btn--primary btn--block${busy ? ' is-busy' : ''}`} disabled={busy}>
                {busy && <span className="spinner" aria-hidden="true" />}
                {busy ? copy.busy : copy.submit}
              </button>
            </form>

            <p className="auth__switch">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" className="link-btn" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </section>
    </main>
  )
}
