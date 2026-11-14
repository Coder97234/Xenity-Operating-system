import { useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { passwordStrength } from '../os/auth'
import { XenityMark } from './Icons'

export default function Setup() {
  const sys = useSystem()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const strength = passwordStrength(password)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!name.trim()) return setError('Tell Xenity your name.')
    if (!username.trim()) return setError('Pick a user name for your home folder.')
    if (password.length < 6) return setError('Use a password with at least 6 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    setError('')
    try {
      await sys.createAccount({ name, username, password })
    } catch {
      setError('Could not create the account on this machine.')
      setBusy(false)
    }
  }

  return (
    <div className="setup wall-aurora">
      <form className="setup-card" onSubmit={submit}>
        <span className="setup-mark">
          <XenityMark size={34} />
        </span>
        <h1>Welcome to Xenity</h1>
        <p className="setup-lede">
          This machine is new. Create your account to finish setting it up — everything stays on this
          computer.
        </p>

        <label className="field">
          <span>Full name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            aria-label="Full name"
          />
        </label>

        <label className="field">
          <span>User name</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
            placeholder="xenity"
            aria-label="User name"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            aria-label="Password"
          />
        </label>

        <div className="strength">
          <i className={`strength-bar score-${strength.score}`} />
          <small>{strength.label}</small>
        </div>

        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            aria-label="Confirm password"
          />
        </label>

        {error && <p className="field-error">{error}</p>}

        <button className="primary setup-submit" type="submit" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account & sign in'}
        </button>
        <p className="fine-print">
          Your password unlocks this machine, the Passwords app and Settings. You can change it later.
        </p>
      </form>
    </div>
  )
}
