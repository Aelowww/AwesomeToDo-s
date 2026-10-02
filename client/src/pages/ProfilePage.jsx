import { useRef, useState } from 'react'
import { auth } from '../api'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { PrivacyPolicy, TermsOfUse } from '../components/LegalText'
import PasswordInput from '../components/PasswordInput'
import Sheet from '../components/Sheet'
import { imageFileToAvatar } from '../utils'

const YEAR_LEVELS = [
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
  '1st year college', '2nd year college', '3rd year college', '4th year college', '5th year college',
  'Graduate school',
]

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
]

// Tracks a form's saving state and result message.
const useFormStatus = () => {
  const [status, setStatus] = useState({ busy: false, error: '', done: '' })
  const run = async (action, doneMessage) => {
    setStatus({ busy: true, error: '', done: '' })
    try {
      await action()
      setStatus({ busy: false, error: '', done: doneMessage })
      return true
    } catch (err) {
      setStatus({ busy: false, error: err.message, done: '' })
      return false
    }
  }
  const fail = (message) => setStatus({ busy: false, error: message, done: '' })
  return [status, run, fail]
}

function StatusLine({ status }) {
  if (status.error) return <p className="form-status form-status--error" role="alert">{status.error}</p>
  if (status.done) return <p className="form-status form-status--ok" role="status">{status.done}</p>
  return null
}

function SettingsRow({ icon, label, description, onClick, tone, children }) {
  const content = (
    <>
      <span className={`settings-row__icon${tone ? ` settings-row__icon--${tone}` : ''}`}><Icon name={icon} size={18} /></span>
      <span className="settings-row__text">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      {children ?? (onClick && <Icon name="right" size={18} />)}
    </>
  )
  return onClick
    ? <button type="button" className={`settings-row${tone ? ` settings-row--${tone}` : ''}`} onClick={onClick}>{content}</button>
    : <div className="settings-row">{content}</div>
}

function PhotoPicker({ user, onPick, busy }) {
  const inputRef = useRef(null)
  return (
    <div className="photo-picker">
      <Avatar user={user} size={104} className="photo-picker__avatar" />
      <button
        type="button"
        className="photo-picker__btn"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Change profile photo"
        title="Change profile photo"
      >
        {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="camera" size={16} />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onPick(file)
        }}
      />
    </div>
  )
}

function EditProfileSheet({ user, onClose, onUserChange }) {
  const [form, setForm] = useState({
    name: user.name,
    school: user.school,
    program: user.program,
    yearLevel: user.yearLevel,
  })
  const [avatar, setAvatar] = useState(user.avatar)
  const [status, run, fail] = useFormStatus()
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  const pickPhoto = async (file) => {
    try {
      setAvatar(await imageFileToAvatar(file))
    } catch (err) {
      fail(err.message)
    }
  }

  const save = async (event) => {
    event.preventDefault()
    const ok = await run(async () => onUserChange(await auth.updateProfile({ ...form, avatar })), 'Profile saved.')
    if (ok) setTimeout(onClose, 600)
  }

  return (
    <Sheet title="Edit profile" subtitle="This is what you see on your profile and how Study Buddy greets you." onClose={onClose}>
      <form className="settings-form" onSubmit={save}>
        <div className="edit-photo">
          <PhotoPicker user={{ ...user, avatar }} onPick={pickPhoto} />
          {avatar && <button type="button" className="link-btn" onClick={() => setAvatar(null)}>Remove photo</button>}
        </div>
        <label className="field">
          <span>Full name</span>
          <input value={form.name} onChange={set('name')} maxLength={60} required autoComplete="name" />
        </label>
        <label className="field">
          <span>School</span>
          <input value={form.school} onChange={set('school')} maxLength={100} placeholder="e.g. Rizal High School" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Course / strand</span>
            <input value={form.program} onChange={set('program')} maxLength={100} placeholder="e.g. STEM, BS Biology" />
          </label>
          <label className="field">
            <span>Year level</span>
            <select value={form.yearLevel} onChange={set('yearLevel')}>
              <option value="">Choose...</option>
              {YEAR_LEVELS.map((y) => <option key={y} value={y}>{y}</option>)}
              {form.yearLevel && !YEAR_LEVELS.includes(form.yearLevel) && <option value={form.yearLevel}>{form.yearLevel}</option>}
            </select>
          </label>
        </div>
        <StatusLine status={status} />
        <div className="settings-form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={status.busy}>{status.busy ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </Sheet>
  )
}

function SecuritySheet({ user, onClose, onUserChange }) {
  const [email, setEmail] = useState({ address: '', password: '' })
  const [emailStatus, runEmail] = useFormStatus()
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordStatus, runPassword, failPassword] = useFormStatus()

  const changeEmail = async (event) => {
    event.preventDefault()
    const ok = await runEmail(async () => onUserChange(await auth.changeEmail(email.address, email.password)), 'Email updated.')
    if (ok) setEmail({ address: '', password: '' })
  }

  const changePassword = async (event) => {
    event.preventDefault()
    if (passwords.next.length < 8) return failPassword('Your new password needs at least 8 characters.')
    if (passwords.next !== passwords.confirm) return failPassword("The new passwords don't match.")
    const ok = await runPassword(() => auth.changePassword(passwords.current, passwords.next), 'Password updated.')
    if (ok) setPasswords({ current: '', next: '', confirm: '' })
  }

  return (
    <Sheet title="Security" subtitle="Keep your account safe." onClose={onClose}>
      <form className="settings-form settings-card" onSubmit={changeEmail}>
        <h3 className="settings-card__title"><Icon name="mail" size={16} /> Change email</h3>
        <p className="muted">Current email: <strong>{user.email}</strong></p>
        <label className="field">
          <span>New email</span>
          <input type="email" value={email.address} onChange={(e) => setEmail({ ...email, address: e.target.value })} autoComplete="email" required />
        </label>
        <PasswordInput label="Your password" value={email.password} onChange={(v) => setEmail({ ...email, password: v })} autoComplete="current-password" />
        <StatusLine status={emailStatus} />
        <div className="settings-form__actions">
          <button type="submit" className="btn btn--primary" disabled={emailStatus.busy}>{emailStatus.busy ? 'Updating...' : 'Update email'}</button>
        </div>
      </form>

      <form className="settings-form settings-card" onSubmit={changePassword}>
        <h3 className="settings-card__title"><Icon name="lock" size={16} /> Change password</h3>
        <PasswordInput label="Current password" value={passwords.current} onChange={(v) => setPasswords({ ...passwords, current: v })} autoComplete="current-password" />
        <PasswordInput label="New password" value={passwords.next} onChange={(v) => setPasswords({ ...passwords, next: v })} autoComplete="new-password" showStrength placeholder="At least 8 characters" />
        <PasswordInput label="Confirm new password" value={passwords.confirm} onChange={(v) => setPasswords({ ...passwords, confirm: v })} autoComplete="new-password" />
        <StatusLine status={passwordStatus} />
        <div className="settings-form__actions">
          <button type="submit" className="btn btn--primary" disabled={passwordStatus.busy}>{passwordStatus.busy ? 'Updating...' : 'Update password'}</button>
        </div>
      </form>
    </Sheet>
  )
}

export default function ProfilePage({ user, onUserChange, onSignOut, theme, onThemeChange }) {
  const [sheet, setSheet] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const closeSheet = () => setSheet(null)

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null
  const studyLine = [user.yearLevel, user.program].filter(Boolean).join(' · ')

  // Changing the photo from the header saves it right away.
  const changePhoto = async (file) => {
    setPhotoError('')
    setPhotoBusy(true)
    try {
      const avatar = await imageFileToAvatar(file)
      onUserChange(await auth.updateProfile({ avatar }))
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <PhotoPicker user={user} onPick={changePhoto} busy={photoBusy} />
        <div className="profile-hero__info">
          <h1>{user.name}</h1>
          {studyLine && <p className="profile-hero__study">{studyLine}</p>}
          {user.school
            ? <p className="profile-hero__school"><Icon name="school" size={16} /> {user.school}</p>
            : <button type="button" className="profile-hero__add" onClick={() => setSheet('edit')}>+ Add your school and year level</button>}
          <p className="profile-hero__email">{user.email}{memberSince && ` · Joined ${memberSince}`}</p>
          {photoError && <p className="form-status form-status--error">{photoError}</p>}
        </div>
        <button type="button" className="btn btn--light profile-hero__edit" onClick={() => setSheet('edit')}>
          <Icon name="edit" size={16} /> Edit profile
        </button>
      </section>

      <div className="settings-groups">
        <section className="settings-group">
          <h2 className="settings-group__title">Account</h2>
          <div className="settings-list">
            <SettingsRow icon="user" label="Edit profile" description="Photo, name, school, course and year level" onClick={() => setSheet('edit')} />
            <SettingsRow icon="shield" label="Security" description="Change your email and password" onClick={() => setSheet('security')} />
          </div>
        </section>

        <section className="settings-group">
          <h2 className="settings-group__title">Preferences</h2>
          <div className="settings-list">
            <SettingsRow icon={theme === 'dark' ? 'moon' : 'sun'} label="Appearance" description="Light, dark, or match your device">
              <div className="mini-segmented" role="radiogroup" aria-label="Theme">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={theme === t.value}
                    className={theme === t.value ? 'is-active' : ''}
                    onClick={() => onThemeChange(t.value)}
                  >{t.label}</button>
                ))}
              </div>
            </SettingsRow>
          </div>
        </section>

        <section className="settings-group">
          <h2 className="settings-group__title">About</h2>
          <div className="settings-list">
            <SettingsRow icon="lock" label="Privacy policy" description="What we store and how it's used" onClick={() => setSheet('privacy')} />
            <SettingsRow icon="doc" label="Terms of use" description="The rules for using Awesome ToDo's" onClick={() => setSheet('terms')} />
            <SettingsRow icon="info" label="Awesome ToDo's" description="Version 2.0 · Made for students" />
          </div>
        </section>

        <section className="settings-group">
          <div className="settings-list">
            <SettingsRow icon="logout" label="Sign out" onClick={onSignOut} />
          </div>
        </section>
      </div>

      {sheet === 'edit' && <EditProfileSheet user={user} onClose={closeSheet} onUserChange={onUserChange} />}
      {sheet === 'security' && <SecuritySheet user={user} onClose={closeSheet} onUserChange={onUserChange} />}
      {sheet === 'privacy' && <Sheet title="Privacy policy" onClose={closeSheet}><PrivacyPolicy /></Sheet>}
      {sheet === 'terms' && <Sheet title="Terms of use" onClose={closeSheet}><TermsOfUse /></Sheet>}
    </div>
  )
}
