import { useEffect, useRef, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { Icon } from './Icons'
import { VERSION } from '../os/updater'

export default function Login() {
  const sys = useSystem()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (busy || !password) return
    setBusy(true)
    const ok = await sys.unlock(password)
    if (ok) {
      setPassword('')
      setError('')
      setBusy(false)
      return
    }
    setError('Incorrect password. Try again.')
    setShake(true)
    setPassword('')
    setBusy(false)
    window.setTimeout(() => setShake(false), 500)
    inputRef.current?.focus()
  }

  const initials = (sys.account?.name || 'X').trim().slice(0, 1).toUpperCase()

  return (
    <div className="login wall-graphite">
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <span className="login-avatar" aria-label="Profile picture">
          {initials}
        </span>
        <h1>{sys.account?.name || sys.settings.user}</h1>
        <p className="login-user">@{sys.account?.username || sys.settings.user}</p>

        <form onSubmit={submit}>
          <label className="login-password">
            <Icon name="lock" size={15} />
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="Enter your password"
              aria-label="Password"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="field-error">{error}</p>}
          <button className="primary login-submit" type="submit" disabled={busy || !password}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="login-foot">
          <button className="link-btn" onClick={() => sys.restart()}>
            Restart
          </button>
          <span>Xenity {VERSION}</span>
          <button className="link-btn" onClick={() => sys.powerOff()}>
            Shut Down
          </button>
        </div>
      </div>
    </div>
  )
}
