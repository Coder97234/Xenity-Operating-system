import { useMemo, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { APP_LIST } from '../os/apps'
import { AppGlyph, Icon } from './Icons'

export default function Launchpad() {
  const sys = useSystem()
  const [query, setQuery] = useState('')

  const apps = useMemo(() => {
    const installed = APP_LIST.filter(
      (app) => !app.hidden && (app.preinstalled || sys.packages.includes(app.id))
    )
    const q = query.trim().toLowerCase()
    return q ? installed.filter((app) => app.name.toLowerCase().includes(q)) : installed
  }, [sys.packages, query])

  return (
    <div className="launchpad" role="dialog" aria-label="Launchpad">
      <div className="lp-search">
        <Icon name="search" size={16} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps"
          aria-label="Search apps"
        />
      </div>
      <div className="lp-grid">
        {apps.map((app) => (
          <button
            key={app.id}
            className="lp-app"
            onClick={() => {
              sys.openApp(app.id)
              sys.setLaunchpadOpen(false)
            }}
          >
            <AppGlyph appId={app.icon} size={74} />
            <span>{app.name}</span>
          </button>
        ))}
        {!apps.length && <p className="lp-empty">No apps match “{query}”.</p>}
      </div>
      <button className="lp-close" onClick={() => sys.setLaunchpadOpen(false)}>
        Close
      </button>
    </div>
  )
}
