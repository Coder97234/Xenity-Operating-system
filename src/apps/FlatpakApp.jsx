import { useSystem } from '../os/SystemContext'
import { FLATPAK_BY_ID, flatpakRef } from '../os/flatpak'
import { AppGlyph, Icon } from '../components/Icons'

export default function FlatpakApp({ win }) {
  const sys = useSystem()
  const pkgId = win.appId.replace('flatpak:', '')
  const app = FLATPAK_BY_ID[pkgId]
  const installed = sys.isFlatpakInstalled(pkgId)

  if (!app) return <p className="files-empty">This Flatpak is no longer installed.</p>

  return (
    <div className="flatpak-app">
      <header className="flatpak-head">
        <AppGlyph appId="flatpak" size={72} color={app.color} letter={app.letter} />
        <div>
          <h1>{app.name}</h1>
          <p>{app.summary}</p>
          <span className="flatpak-pill">
            <Icon name="box" size={13} /> Flatpak · {app.category}
          </span>
        </div>
      </header>

      <div className="flatpak-grid">
        <div>
          <span>Application ID</span>
          <strong className="mono">{app.id}</strong>
        </div>
        <div>
          <span>Version</span>
          <strong>{app.version}</strong>
        </div>
        <div>
          <span>Publisher</span>
          <strong>{app.publisher}</strong>
        </div>
        <div>
          <span>Runtime</span>
          <strong>{app.runtime}</strong>
        </div>
        <div>
          <span>Download size</span>
          <strong>{app.size}</strong>
        </div>
        <div>
          <span>Ref</span>
          <strong className="mono">{flatpakRef(app)}</strong>
        </div>
      </div>

      <div className="flatpak-sandbox">
        <Icon name="shield" size={16} />
        <div>
          <strong>Sandbox</strong>
          <p>
            This app runs in a Xenity sandbox with its own runtime. Browser builds can't execute Linux
            binaries, so Xenity opens the installed app card — the Flatpak itself, its runtime and its
            desktop entry are real.
          </p>
        </div>
      </div>

      <div className="flatpak-actions">
        <a className="primary" href={`https://flathub.org/apps/${app.id}`} target="_blank" rel="noreferrer">
          Open on Flathub ↗
        </a>
        <button className="ghost" onClick={() => sys.openApp('finder', { path: '/Applications' })}>
          Show desktop entry
        </button>
        {installed && (
          <button
            className="ghost danger"
            onClick={() => {
              sys.uninstallFlatpak(pkgId)
              sys.closeWindow(win.id)
            }}
          >
            Uninstall
          </button>
        )}
      </div>

      <p className="fine-print mono">flatpak run {app.id}</p>
    </div>
  )
}
