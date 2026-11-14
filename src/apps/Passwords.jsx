import { useMemo, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { verifyPassword } from '../os/auth'
import { maskSecret, VAULT_TYPES } from '../os/vault'
import { AppGlyph, Icon } from '../components/Icons'

export default function Passwords() {
  const sys = useSystem()
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [revealed, setRevealed] = useState({})
  const [copied, setCopied] = useState('')
  const [draft, setDraft] = useState(null)

  const lock = () => {
    setUnlocked(false)
    setPassword('')
    setRevealed({})
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const ok = await verifyPassword(password)
    setBusy(false)
    if (!ok) {
      setError('Incorrect password.')
      setPassword('')
      return
    }
    setError('')
    setUnlocked(true)
  }

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sys.vault
      .filter(
        (entry) =>
          !q ||
          entry.title.toLowerCase().includes(q) ||
          (entry.username || '').toLowerCase().includes(q) ||
          VAULT_TYPES[entry.type]?.toLowerCase().includes(q)
      )
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [sys.vault, query])

  const copy = async (entry, field = 'password') => {
    try {
      await navigator.clipboard.writeText(entry[field] || '')
    } catch {
      /* clipboard blocked */
    }
    setCopied(entry.id)
    sys.notify('Copied to clipboard', `${entry.title} — ${field}`)
    window.setTimeout(() => setCopied(''), 1600)
  }

  if (!unlocked) {
    return (
      <div className="pw">
        <div className="pw-locked">
          <span className="pw-lock-icon">
            <AppGlyph appId="passwords" size={64} />
          </span>
          <h1>Passwords</h1>
          <p>Enter the password for {sys.settings.user} to see saved passwords.</p>
          <form onSubmit={submit} className="pw-unlock">
            <label className="login-password">
              <Icon name="lock" size={15} />
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Account password"
                aria-label="Account password"
              />
            </label>
            <button className="primary" type="submit" disabled={busy || !password}>
              {busy ? 'Checking…' : 'Unlock'}
            </button>
          </form>
          {error && <p className="field-error">{error}</p>}
          <p className="fine-print">Passwords stay on this machine and never leave it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pw">
      <header className="pw-head">
        <div>
          <h1>Passwords</h1>
          <p>{sys.vault.length} saved · locked with your account password</p>
        </div>
        <div className="pw-head-actions">
          <button className="ghost" onClick={lock}>
            <Icon name="lock" size={14} /> Lock
          </button>
          <button
            className="primary"
            onClick={() =>
              setDraft({ type: 'website', title: '', username: '', password: '', url: '' })
            }
          >
            <Icon name="plus" size={14} /> New password
          </button>
        </div>
      </header>

      <label className="store-search pw-search">
        <Icon name="search" size={15} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search passwords" aria-label="Search passwords" />
      </label>

      {draft && (
        <form
          className="pw-draft"
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft.title.trim() || !draft.password) return
            if (draft.id) sys.updateCredential(draft.id, draft)
            else sys.addCredential(draft)
            setDraft(null)
          }}
        >
          <div className="pw-draft-grid">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Name (e.g. GitHub)"
              aria-label="Entry name"
              autoFocus
            />
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
              aria-label="Entry type"
            >
              {Object.entries(VAULT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
              placeholder="User name"
              aria-label="User name"
            />
            <input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="Website (optional)"
              aria-label="Website"
            />
            <input
              type="text"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              placeholder="Password"
              aria-label="Password"
            />
          </div>
          <div className="pw-draft-actions">
            <button className="ghost" type="button" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button className="primary" type="submit">
              Save password
            </button>
          </div>
        </form>
      )}

      <div className="pw-list">
        {entries.map((entry) => (
          <article key={entry.id} className="pw-row">
            <span className={`pw-badge type-${entry.type}`}>
              <Icon name={entry.type === 'wifi' ? 'wifi' : entry.type === 'app' ? 'box' : 'globe'} size={15} />
            </span>
            <div className="pw-row-main">
              <strong>{entry.title}</strong>
              <small>
                {entry.username || VAULT_TYPES[entry.type]}
                {entry.url ? ` · ${entry.url}` : ''}
              </small>
            </div>
            <code className="pw-secret">
              {revealed[entry.id] ? entry.password : maskSecret(entry.password)}
            </code>
            <div className="pw-row-actions">
              <button
                className="icon-btn"
                aria-label={revealed[entry.id] ? 'Hide password' : 'Show password'}
                onClick={() => setRevealed((r) => ({ ...r, [entry.id]: !r[entry.id] }))}
              >
                <Icon name={revealed[entry.id] ? 'eyeOff' : 'eye'} size={15} />
              </button>
              <button className="icon-btn" aria-label="Copy password" onClick={() => copy(entry)}>
                <Icon name={copied === entry.id ? 'check' : 'copy'} size={15} />
              </button>
              <button
                className="icon-btn"
                aria-label="Edit password"
                onClick={() => setDraft({ ...entry })}
              >
                <Icon name="edit" size={15} />
              </button>
              <button
                className="icon-btn danger"
                aria-label="Delete password"
                onClick={() => sys.removeCredential(entry.id)}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          </article>
        ))}
        {!entries.length && (
          <p className="files-empty">
            No saved passwords yet. Wi-Fi passwords land here automatically when you join a network.
          </p>
        )}
      </div>
    </div>
  )
}
