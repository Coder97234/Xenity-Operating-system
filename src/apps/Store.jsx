import { useMemo, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { STORE_APPS } from '../os/apps'
import { findFlatpak } from '../os/flatpak'
import { flatpakKey } from '../os/appindex'
import { AppGlyph, Icon } from '../components/Icons'

export default function Store() {
  const sys = useSystem()
  const [tab, setTab] = useState('flathub')
  const [query, setQuery] = useState('')

  const native = useMemo(() => {
    const q = query.trim().toLowerCase()
    return STORE_APPS.filter(
      (app) =>
        !q ||
        app.name.toLowerCase().includes(q) ||
        (app.description || '').toLowerCase().includes(q) ||
        (app.tag || '').toLowerCase().includes(q)
    )
  }, [query])

  const flathub = useMemo(() => findFlatpak(query), [query])

  return (
    <div className="store">
      <header className="store-head">
        <div>
          <h1>Xenity Store</h1>
          <p>System apps and Flathub — installing adds the app to the Dock and Launchpad.</p>
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

      <div className="store-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'flathub'}
          className={tab === 'flathub' ? 'active' : ''}
          onClick={() => setTab('flathub')}
        >
          <Icon name="box" size={15} /> Flathub
          <span className="tab-count">{sys.flatpaks.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'xenity'}
          className={tab === 'xenity' ? 'active' : ''}
          onClick={() => setTab('xenity')}
        >
          <Icon name="grid" size={15} /> Xenity apps
        </button>
      </div>

      {tab === 'flathub' ? (
        <>
          <p className="store-note">
            <Icon name="box" size={14} /> Flatpak apps from <strong>flathub.org</strong> — each installs its
            runtime and a desktop entry in <code>/Applications</code>.
          </p>
          <div className="store-grid">
            {flathub.map((app) => {
              const installed = sys.isFlatpakInstalled(app.id)
              return (
                <article key={app.id} className="store-card">
                  <div className="store-card-top">
                    <AppGlyph appId="flatpak" size={56} color={app.color} letter={app.letter} />
                    <div className="store-card-title">
                      <strong>{app.name}</strong>
                      <small>
                        {app.publisher} · {app.category}
                      </small>
                    </div>
                    {installed ? (
                      <button className="pill installed" onClick={() => sys.openApp(flatpakKey(app.id))}>
                        Open
                      </button>
                    ) : (
                      <button className="pill" onClick={() => sys.installFlatpak(app.id)}>
                        Install
                      </button>
                    )}
                  </div>
                  <p>{app.summary}</p>
                  <div className="store-card-foot">
                    <span>
                      {app.size} · {app.version}
                    </span>
                    <a
                      className="link-btn"
                      href={`https://flathub.org/apps/${app.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Flathub ↗
                    </a>
                    {installed && (
                      <button className="link-btn" onClick={() => sys.uninstallFlatpak(app.id)}>
                        Uninstall
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
            {!flathub.length && <p className="files-empty">Nothing on Flathub matches “{query}”.</p>}
          </div>
        </>
      ) : (
        <div className="store-grid">
          {native.map((app) => {
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
          {!native.length && <p className="files-empty">No apps match “{query}”.</p>}
        </div>
      )}
    </div>
  )
}
