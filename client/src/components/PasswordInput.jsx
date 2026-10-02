import { useState } from 'react'
import { passwordStrength } from '../utils'

// Password field with a Show/Hide toggle and an optional strength meter.
export default function PasswordInput({ label, value, onChange, autoComplete, showStrength = false, placeholder }) {
  const [visible, setVisible] = useState(false)
  const strength = passwordStrength(value)

  return (
    <label className="field">
      <span>{label}</span>
      <span className="password">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
        />
        <button type="button" className="password__toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {showStrength && value && (
        <span className={`strength strength--${strength.score}`} aria-live="polite">
          <span className="strength__bars" aria-hidden="true"><i /><i /><i /><i /></span>
          {strength.label}
        </span>
      )}
    </label>
  )
}
