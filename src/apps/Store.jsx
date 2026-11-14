import { useMemo, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { STORE_APPS } from '../os/apps'
import { AppGlyph, Icon } from '../components/Icons'

export default function Store() {
  const sys = useSystem()
  const [query, setQuery] = useState('')

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase()
    return STORE_APPS.filter(
      (app) =>
        !q ||
        app.name.toLowerCase().includes(q) ||
        (app.description || '').toLowerCase().includes(q) ||
        (app.tag || '').toLowerCase().includes(q)
    )
  }, [query])

  return (
    <div className="store">
      <header className="store-head">
        <div>
          <h1>Xenity Store</h1>
          <p>Applications built into Xenity. Installing one adds it to the Dock.</p>
        </div>
        <label className="store-search">
          <Icon name="search" size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps"
            aria-label="Search the store"
          />
        </label>
      </header>

      <div className="store-grid">
        {apps.map((app) => {
          const installed = sys.isInstalled(app.id)
          return (
            <article key={app.id} className="store-card">
              <div className="store-card-top">
                <AppGlyph appId={app.icon} size={56} />
                <div className="store-card-title">
                  <strong>{app.name}</strong>
                  <small>{app.tag || 'System'}</small>
                </div>
                {installed ? (
                  <button className="pill installed" onClick={() => sys.openApp(app.id)}>
                    Open
                  </button>
                ) : (
                  <button className="pill" onClick={() => sys.installPkg(app.id)}>
                    Get
                  </button>
                )}
              </div>
              <p>{app.description}</p>
              <div className="store-card-foot">
                <span>{app.size || 'core'}</span>
                {installed && !app.preinstalled && (
                  <button className="link-btn" onClick={() => sys.uninstallPkg(app.id)}>
                    Uninstall
                  </button>
                )}
                {app.preinstalled && <span className="tag">preinstalled</span>}
              </div>
            </article>
          )
        })}
        {!apps.length && <p className="files-empty">No apps match “{query}”.</p>}
      </div>
    </div>
  )
}
