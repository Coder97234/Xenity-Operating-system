import { useSystem } from '../os/SystemContext'
import { APP_LIST } from '../os/apps'
import { AppGlyph } from './Icons'

export default function Dock() {
  const sys = useSystem()
  const apps = APP_LIST.filter(
    (app) => !app.hidden && (app.preinstalled || sys.packages.includes(app.id))
  )

  const handleClick = (app) => {
    const open = sys.windows.filter((w) => w.appId === app.id)
    if (open.length) {
      const top = open.reduce((a, b) => (a.z > b.z ? a : b))
      if (!top.minimized && sys.activeWindow?.id === top.id) sys.minimizeWindow(top.id)
      else sys.focusWindow(top.id)
      return
    }
    sys.openApp(app.id)
  }

  return (
    <nav className="dock" aria-label="Dock">
      <button
        className="dock-item launcher"
        onClick={() => sys.setLaunchpadOpen(!sys.launchpadOpen)}
        data-label="Launchpad"
        aria-label="Launchpad"
      >
        <span className="dock-tile">
          <span className="launchpad-glyph">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </span>
      </button>

      <div className="dock-sep" />

      {apps.map((app) => {
        const open = sys.windows.some((w) => w.appId === app.id)
        return (
          <button
            key={app.id}
            className="dock-item"
            onClick={() => handleClick(app)}
            data-label={app.name}
            aria-label={app.name}
          >
            <AppGlyph appId={app.icon} />
            {open && <span className="dock-dot" />}
          </button>
        )
      })}
    </nav>
  )
}
