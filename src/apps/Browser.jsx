import { useEffect, useRef, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { Icon } from '../components/Icons'

const HOME_URL = 'xenity://start'

const SHORTCUTS = [
  { label: 'Xenity Store', url: 'xenity://store' },
  { label: 'Xenity Docs', url: 'xenity://docs' },
  { label: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com' },
  { label: 'Example.com', url: 'https://example.com' },
]

function normalize(input) {
  const raw = input.trim()
  if (!raw) return HOME_URL
  if (/^xenity:\/\//i.test(raw)) return raw
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/.test(raw)) return `https://${raw}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(raw)}`
}

const titleFor = (url) => {
  if (url.startsWith('xenity://start')) return 'Start Page'
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

export default function Browser() {
  const sys = useSystem()
  const [tabs, setTabs] = useState(() => [newTab()])
  const [activeId, setActiveId] = useState(() => tabs[0].id)
  const [draft, setDraft] = useState(HOME_URL)
  const [heroQuery, setHeroQuery] = useState('')
  const [nonce, setNonce] = useState(0)
  const active = tabs.find((t) => t.id === activeId) || tabs[0]
  const frameRef = useRef(null)

  useEffect(() => {
    setDraft(active.url)
  }, [active.url, active.id])

  const updateTab = (id, patch) =>
    setTabs((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))

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
          <Icon name="lock" size={13} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.target.select()}
            spellCheck={false}
            aria-label="Address"
            placeholder="Search or enter a website"
          />
        </div>
        {!isInternal && (
          <a className="br-open" href={active.url} target="_blank" rel="noreferrer" title="Open in a real tab">
            <Icon name="download" size={15} />
          </a>
        )}
      </form>

      {isInternal ? (
        <div className="br-view br-start">
          {active.url === 'xenity://store' && (
            <div className="br-inner">
              <h1>Xenity Store</h1>
              <p className="lede">Install Calculator, Notes and Weather — then find them in the Dock.</p>
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
                <li><strong>Terminal</strong> — ls, cd, cat, mkdir, rm, mv, cp, tree, df, open, pkg, update, neofetch.</li>
                <li><strong>Files</strong> — double click folders to open, double click text files to edit.</li>
                <li><strong>Storage</strong> — Xenity keeps itself in kilobytes; your files live in this browser.</li>
                <li><strong>Updates</strong> — the updater removes Xenity's own old caches only, never your files.</li>
              </ul>
            </div>
          )}
          {(active.url === HOME_URL || !['xenity://store', 'xenity://docs'].includes(active.url)) && (
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
                    placeholder="Search the web or enter an address"
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
                    <small>{s.url.replace('https://', '').replace('xenity://', 'xenity://')}</small>
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
                  <small>Appearance &amp; updates</small>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="br-view">
          <iframe
            ref={frameRef}
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
