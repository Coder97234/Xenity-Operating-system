import { useEffect, useMemo, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { Icon, AppGlyph } from '../components/Icons'
import { HOME, joinPath } from '../os/fs'
import { hostOf } from '../os/vault'
import { SETTINGS_SECTIONS } from './Settings'

const HOME_URL = 'xenity://start'

const SHORTCUTS = [
  { label: 'Xenity Store', url: 'xenity://store' },
  { label: 'Xenity Docs', url: 'xenity://docs' },
  { label: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com' },
  { label: 'Flathub', url: 'https://flathub.org' },
]

const WEB_SEARCHES = [
  { label: 'Google', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { label: 'DuckDuckGo', url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  { label: 'Bing', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { label: 'YouTube', url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  { label: 'Wikipedia', url: (q) => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}` },
]

function normalize(input) {
  const raw = input.trim()
  if (!raw) return HOME_URL
  if (/^xenity:\/\//i.test(raw)) return raw
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/.test(raw)) return `https://${raw}`
  return `xenity://search?q=${encodeURIComponent(raw)}`
}

const searchQueryOf = (url) => {
  try {
    return new URL(url).searchParams.get('q') || ''
  } catch {
    return ''
  }
}

const titleFor = (url) => {
  if (url.startsWith('xenity://start')) return 'Start Page'
  if (url.startsWith('xenity://search')) return `Search: ${searchQueryOf(url)}`
  if (url.startsWith('xenity://')) return 'Xenity — ' + url.replace('xenity://', '')
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

let tabSeq = 0
const newTab = (url = HOME_URL) => ({
  id: `tab-${++tabSeq}`,
  url,
  title: titleFor(url),
  history: [url],
  index: 0,
})

export default function Browser({ win }) {
  const sys = useSystem()
  const [tabs, setTabs] = useState(() => [newTab(win?.payload?.url || HOME_URL)])
  const [activeId, setActiveId] = useState(() => tabs[0].id)
  const [draft, setDraft] = useState(() => tabs[0].url)
  const [heroQuery, setHeroQuery] = useState('')
  const [nonce, setNonce] = useState(0)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [newLogin, setNewLogin] = useState({ username: '', password: '' })
  const active = tabs.find((t) => t.id === activeId) || tabs[0]

  useEffect(() => {
    setDraft(active.url)
  }, [active.url, active.id])

  const updateTab = (id, patch) => setTabs((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const navigate = (raw) => {
    const url = normalize(raw)
    setTabs((list) =>
      list.map((t) => {
        if (t.id !== active.id) return t
        const history = [...t.history.slice(0, t.index + 1), url]
        return { ...t, url, title: titleFor(url), history, index: history.length - 1 }
      })
    )
    setNonce((n) => n + 1)
  }

  const back = () => {
    if (active.index <= 0) return
    const index = active.index - 1
    const url = active.history[index]
    updateTab(active.id, { index, url, title: titleFor(url) })
    setNonce((n) => n + 1)
  }

  const forward = () => {
    if (active.index >= active.history.length - 1) return
    const index = active.index + 1
    const url = active.history[index]
    updateTab(active.id, { index, url, title: titleFor(url) })
    setNonce((n) => n + 1)
  }

  const closeTab = (id) => {
    if (tabs.length === 1) {
      const fresh = newTab()
      setTabs([fresh])
      setActiveId(fresh.id)
      return
    }
    const index = tabs.findIndex((t) => t.id === id)
    const next = tabs.filter((t) => t.id !== id)
    setTabs(next)
    if (id === activeId) setActiveId(next[Math.max(0, index - 1)].id)
  }

  const addTab = () => {
    const tab = newTab()
    setTabs((list) => [...list, tab])
    setActiveId(tab.id)
  }

  const isInternal = active.url.startsWith('xenity://')
  const query = searchQueryOf(active.url)
  const host = isInternal ? '' : hostOf(active.url)

  const localResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { apps: [], files: [], settings: [] }
    const apps = sys.appList.filter((app) => !app.hidden && app.name.toLowerCase().includes(q)).slice(0, 6)
    let files = []
    try {
      files = sys.fs
        .walk(HOME)
        .filter((entry) => entry.name.toLowerCase().includes(q))
        .slice(0, 8)
    } catch {
      files = []
    }
    const settings = SETTINGS_SECTIONS.filter((s) => s.label.toLowerCase().includes(q))
    return { apps, files, settings }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sys.fsVersion, sys.flatpaks])

  const savedLogins = useMemo(
    () =>
      host
        ? sys.vault.filter(
            (entry) => entry.type === 'website' && (hostOf(entry.url || entry.title) === host || entry.title === host)
          )
        : [],
    [sys.vault, host]
  )

  return (
    <div className="br">
      <div className="br-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`br-tab ${tab.id === active.id ? 'active' : ''}`}
            onClick={() => setActiveId(tab.id)}
          >
            <span className="br-favicon" />
            <span className="br-tab-title">{tab.title}</span>
            <button
              className="br-tab-close"
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              aria-label="Close tab"
            >
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
        <button className="br-new-tab" onClick={addTab} aria-label="New tab">
          <Icon name="plus" size={14} />
        </button>
      </div>

      <form
        className="br-bar"
        onSubmit={(e) => {
          e.preventDefault()
          navigate(draft)
        }}
      >
        <div className="seg">
          <button type="button" onClick={back} disabled={active.index <= 0} aria-label="Back">
            <Icon name="chevronLeft" size={16} />
          </button>
          <button
            type="button"
            onClick={forward}
            disabled={active.index >= active.history.length - 1}
            aria-label="Forward"
          >
            <Icon name="chevronRight" size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setNonce((n) => n + 1)
              setDraft(active.url)
            }}
            aria-label="Reload"
          >
            <Icon name="refresh" size={15} />
          </button>
        </div>
        <div className="br-url">
          <Icon name="search" size={13} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.target.select()}
            spellCheck={false}
            aria-label="Address"
            placeholder="Search the web or enter a website"
          />
        </div>
        {!isInternal && (
          <div className="br-vault">
            <button
              type="button"
              className={`br-icon ${vaultOpen ? 'on' : ''} ${savedLogins.length ? 'has' : ''}`}
              onClick={() => setVaultOpen(!vaultOpen)}
              aria-label="Passwords for this site"
              title="Passwords for this site"
            >
              <Icon name="key" size={15} />
            </button>
            {vaultOpen && (
              <div className="br-vault-pop">
                <strong>{host}</strong>
                {savedLogins.map((entry) => (
                  <div key={entry.id} className="br-vault-row">
                    <span>{entry.username || 'login'}</span>
                    <button
                      className="link-btn"
                      onClick={() => {
                        navigator.clipboard?.writeText(entry.password).catch(() => {})
                        sys.notify('Password copied', `${host} — paste it into the site's login form.`)
                      }}
                    >
                      Copy
                    </button>
                  </div>
                ))}
                {!savedLogins.length && <p>No saved login for {host} yet.</p>}
                <form
                  className="br-vault-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!newLogin.username || !newLogin.password) return
                    sys.addCredential({
                      type: 'website',
                      title: host,
                      username: newLogin.username,
                      password: newLogin.password,
                      url: active.url,
                    })
                    setNewLogin({ username: '', password: '' })
                    sys.notify('Login saved', `${host} — stored in Passwords.`)
                  }}
                >
                  <input
                    value={newLogin.username}
                    onChange={(e) => setNewLogin({ ...newLogin, username: e.target.value })}
                    placeholder="User name"
                    aria-label="Site user name"
                  />
                  <input
                    type="password"
                    value={newLogin.password}
                    onChange={(e) => setNewLogin({ ...newLogin, password: e.target.value })}
                    placeholder="Password"
                    aria-label="Site password"
                  />
                  <button className="pill" type="submit">
                    Save
                  </button>
                </form>
                <button className="link-btn" onClick={() => sys.openApp('passwords')}>
                  Open Passwords
                </button>
              </div>
            )}
          </div>
        )}
        {!isInternal && (
          <a className="br-open" href={active.url} target="_blank" rel="noreferrer" title="Open in a real tab">
            <Icon name="download" size={15} />
          </a>
        )}
      </form>

      {isInternal ? (
        <div className="br-view br-start">
          {active.url.startsWith('xenity://search') && (
            <div className="br-inner">
              <h1>Search “{query}”</h1>
              <p className="lede">Search the web, or find it on this machine.</p>
              <div className="br-search-web">
                {WEB_SEARCHES.map((engine) => (
                  <a
                    key={engine.label}
                    className="br-shortcut"
                    href={engine.url(query)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="br-shortcut-dot" />
                    <span>{engine.label}</span>
                    <small>search the web ↗</small>
                  </a>
                ))}
              </div>

              {!!localResults.apps.length && (
                <>
                  <h2>Applications</h2>
                  <div className="br-shortcut-grid">
                    {localResults.apps.map((app) => (
                      <button key={app.id} className="br-shortcut" onClick={() => sys.openApp(app.id)}>
                        <AppGlyph appId={app.icon} size={26} color={app.color} letter={app.letter} />
                        <span>{app.name}</span>
                        <small>{app.isFlatpak ? 'Flatpak' : app.tag || 'System'}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!!localResults.files.length && (
                <>
                  <h2>Files on Xenity Drive</h2>
                  <div className="br-shortcut-grid">
                    {localResults.files.map((file) => (
                      <button
                        key={file.path}
                        className="br-shortcut"
                        onClick={() =>
                          file.type === 'dir'
                            ? sys.openApp('finder', { path: file.path })
                            : sys.openApp('editor', { path: file.path })
                        }
                      >
                        <span className="br-shortcut-dot alt" />
                        <span>{file.name}</span>
                        <small>{file.path.replace(HOME, '~')}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!!localResults.settings.length && (
                <>
                  <h2>Settings</h2>
                  <div className="br-shortcut-grid">
                    {localResults.settings.map((section) => (
                      <button
                        key={section.id}
                        className="br-shortcut"
                        onClick={() => sys.openApp('settings', { section: section.id })}
                      >
                        <span className="br-shortcut-dot alt" />
                        <span>{section.label}</span>
                        <small>Settings</small>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!localResults.apps.length && !localResults.files.length && !localResults.settings.length && (
                <p className="fine-print">Nothing on this machine matches “{query}”.</p>
              )}
            </div>
          )}

          {active.url === 'xenity://store' && (
            <div className="br-inner">
              <h1>Xenity Store</h1>
              <p className="lede">Install Xenity apps and Flatpaks from Flathub — then find them in the Dock.</p>
              <button className="primary" onClick={() => sys.openApp('store')}>
                Open the Store
              </button>
            </div>
          )}

          {active.url === 'xenity://docs' && (
            <div className="br-inner">
              <h1>Xenity Docs</h1>
              <p className="lede">Everything on this machine, in short.</p>
              <ul className="br-docs">
                <li><strong>Terminal</strong> — 60+ commands: ls, cd, grep, find, ps, flatpak, wifi, nuke…</li>
                <li><strong>Store</strong> — Xenity apps plus Flathub Flatpaks with runtimes.</li>
                <li><strong>Passwords</strong> — website and Wi-Fi logins, locked behind your account password.</li>
                <li><strong>Files</strong> — double click folders to open, double click text files to edit.</li>
                <li><strong>Updates</strong> — the updater removes Xenity's own old caches only, never your files.</li>
              </ul>
            </div>
          )}

          {(active.url === HOME_URL || !/^xenity:\/\/(search|store|docs)/.test(active.url)) && (
            <div className="br-inner">
              <div className="br-hero">
                <div className="br-hero-mark">X</div>
                <h1>Start Page</h1>
                <form
                  className="br-hero-search"
                  onSubmit={(e) => {
                    e.preventDefault()
                    navigate(heroQuery)
                    setHeroQuery('')
                  }}
                >
                  <Icon name="search" size={16} />
                  <input
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder="Search the web, apps and files"
                    aria-label="Search"
                  />
                </form>
              </div>
              <h2>Shortcuts</h2>
              <div className="br-shortcut-grid">
                {SHORTCUTS.map((s) => (
                  <button key={s.url} className="br-shortcut" onClick={() => navigate(s.url)}>
                    <span className="br-shortcut-dot" />
                    <span>{s.label}</span>
                    <small>{s.url.replace('https://', '')}</small>
                  </button>
                ))}
              </div>
              <h2>On this machine</h2>
              <div className="br-shortcut-grid">
                <button className="br-shortcut" onClick={() => sys.openApp('finder')}>
                  <span className="br-shortcut-dot alt" />
                  <span>Files</span>
                  <small>Browse Xenity Drive</small>
                </button>
                <button className="br-shortcut" onClick={() => sys.openApp('terminal')}>
                  <span className="br-shortcut-dot alt" />
                  <span>Terminal</span>
                  <small>Open a shell</small>
                </button>
                <button className="br-shortcut" onClick={() => sys.openApp('settings')}>
                  <span className="br-shortcut-dot alt" />
                  <span>Settings</span>
                  <small>Display, network &amp; more</small>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="br-view">
          <iframe
            key={`${active.url}-${nonce}`}
            src={active.url}
            title={active.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
          />
          <div className="br-blocked">
            <span>Site not showing? Some sites refuse to be embedded.</span>
            <a href={active.url} target="_blank" rel="noreferrer">
              Open in a new tab ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
