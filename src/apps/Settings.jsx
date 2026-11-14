import { useMemo, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { formatBytes } from '../os/fs'
import { CHANGELOG, CODENAME, VERSION } from '../os/updater'
import { buildIso, downloadIso } from '../os/iso'
import { Icon, XenityMark } from '../components/Icons'

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: 'sliders' },
  { id: 'account', label: 'Account', icon: 'lock' },
  { id: 'storage', label: 'Storage', icon: 'drive' },
  { id: 'updates', label: 'Updates', icon: 'refresh' },
  { id: 'about', label: 'About', icon: 'gear' },
]

const ACCENTS = ['#0a84ff', '#ff375f', '#30d158', '#ff9f0a', '#bf5af2', '#64d2ff']
const WALLPAPERS = [
  { id: 'aurora', label: 'Aurora' },
  { id: 'dune', label: 'Dune' },
  { id: 'mint', label: 'Mint' },
  { id: 'graphite', label: 'Graphite' },
]

export default function Settings() {
  const sys = useSystem()
  const [section, setSection] = useState('appearance')

  const stats = useMemo(() => {
    const fs = sys.fs
    const system = fs.du(fs.node('/System')) + fs.du(fs.node('/Library'))
    const cache = fs.du(fs.node('/var/cache'))
    const user = fs.du(fs.node('/Users'))
    let storage = 0
    try {
      for (const key of Object.keys(localStorage)) storage += key.length + (localStorage.getItem(key) || '').length
    } catch {
      storage = 0
    }
    return { system, cache, user, total: system + cache + user, storage }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.fsVersion])

  const iso = useMemo(() => buildIso(), [])

  const updateLog = useMemo(() => {
    try {
      return sys.fs.read('/var/log/update.log').trim().split('\n').filter(Boolean)
    } catch {
      return []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.fsVersion])

  return (
    <div className="set">
      <aside className="set-side">
        <div className="set-user">
          <span className="avatar">{sys.settings.user.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{sys.settings.user}</strong>
            <small>xenity</small>
          </div>
        </div>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={section === s.id ? 'active' : ''}
            onClick={() => setSection(s.id)}
          >
            <Icon name={s.icon} size={16} /> {s.label}
          </button>
        ))}
      </aside>

      <div className="set-main">
        {section === 'appearance' && (
          <>
            <h2>Appearance</h2>
            <div className="set-row">
              <div>
                <strong>Theme</strong>
                <p>Xenity ships light by default — it is built to feel weightless.</p>
              </div>
              <div className="segmented">
                {['light', 'dark'].map((theme) => (
                  <button
                    key={theme}
                    className={sys.settings.theme === theme ? 'active' : ''}
                    onClick={() => sys.updateSettings({ theme })}
                  >
                    {theme === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
            </div>

            <div className="set-row">
              <div>
                <strong>Accent colour</strong>
                <p>Used for highlights, selections and the Dock indicator.</p>
              </div>
              <div className="swatches">
                {ACCENTS.map((color) => (
                  <button
                    key={color}
                    className={`swatch ${sys.settings.accent === color ? 'active' : ''}`}
                    style={{ background: color }}
                    onClick={() => sys.updateSettings({ accent: color })}
                    aria-label={`Accent ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="set-row column">
              <div>
                <strong>Wallpaper</strong>
                <p>Pure CSS — not a single image file on disk.</p>
              </div>
              <div className="wallpaper-grid">
                {WALLPAPERS.map((w) => (
                  <button
                    key={w.id}
                    className={`wallpaper-card wall-${w.id} ${sys.settings.wallpaper === w.id ? 'active' : ''}`}
                    onClick={() => sys.updateSettings({ wallpaper: w.id })}
                  >
                    <span>{w.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {section === 'account' && (
          <>
            <h2>Account</h2>
            <div className="set-row">
              <div>
                <strong>Full name</strong>
                <p>Shown in the menu bar, terminal prompt and file manager.</p>
              </div>
              <input
                className="text-input"
                value={sys.settings.user}
                onChange={(e) => sys.updateSettings({ user: e.target.value.slice(0, 24) || 'xenity' })}
                aria-label="User name"
              />
            </div>
            <div className="set-row">
              <div>
                <strong>Hostname</strong>
                <p>The name of this machine.</p>
              </div>
              <span className="mono">xenity</span>
            </div>
            <div className="set-row">
              <div>
                <strong>Home folder</strong>
                <p>Everything you create lives here.</p>
              </div>
              <button className="ghost" onClick={() => sys.openApp('finder')}>
                Open /Users/{sys.settings.user}
              </button>
            </div>
          </>
        )}

        {section === 'storage' && (
          <>
            <h2>Storage</h2>
            <div className="storage-bar">
              <span className="sb-os" style={{ width: `${Math.max(2, (stats.system / Math.max(stats.total, 1)) * 100)}%` }} />
              <span className="sb-user" style={{ width: `${Math.max(2, (stats.user / Math.max(stats.total, 1)) * 100)}%` }} />
              <span className="sb-cache" style={{ width: `${Math.max(2, (stats.cache / Math.max(stats.total, 1)) * 100)}%` }} />
            </div>
            <div className="legend">
              <span><i className="dot os" /> Xenity OS — {formatBytes(stats.system)}</span>
              <span><i className="dot user" /> Your files — {formatBytes(stats.user)}</span>
              <span><i className="dot cache" /> System cache — {formatBytes(stats.cache)}</span>
            </div>
            <div className="set-row">
              <div>
                <strong>Xenity itself</strong>
                <p>Kernel, window server and apps are loaded from the web bundle — no virtual machine.</p>
              </div>
              <span className="mono">{formatBytes(stats.system)}</span>
            </div>
            <div className="set-row">
              <div>
                <strong>Browser storage in use</strong>
                <p>Files, settings and notes, kept on this machine only.</p>
              </div>
              <span className="mono">{formatBytes(stats.storage)}</span>
            </div>
            <div className="set-row">
              <div>
                <strong>Free space</strong>
                <p>Xenity's disk is your browser's storage; nothing else is touched.</p>
              </div>
              <span className="mono">64 GB (reported)</span>
            </div>
            <button
              className="ghost"
              onClick={() => {
                const result = sys.runSystemUpdate()
                sys.notify('System cache cleaned', `Reclaimed ${formatBytes(result.reclaimed)}. Your files were left alone.`)
              }}
            >
              Clean system cache
            </button>
          </>
        )}

        {section === 'updates' && (
          <>
            <h2>Updates</h2>
            <div className="card">
              <div className="card-head">
                <XenityMark size={20} />
                <div>
                  <strong>Xenity {VERSION} ({CODENAME})</strong>
                  <p>You are running the latest version.</p>
                </div>
              </div>
              <button
                className="primary"
                onClick={() => {
                  const result = sys.runSystemUpdate()
                  sys.notify(
                    result.updated ? 'Xenity updated' : 'No updates found',
                    result.reclaimed ? `Reclaimed ${formatBytes(result.reclaimed)} of old system cache.` : 'The system is already clean.'
                  )
                }}
              >
                Check for updates
              </button>
            </div>

            <h3>What's new</h3>
            <ul className="changelog">
              {CHANGELOG.map((entry) => (
                <li key={entry.version}>
                  <strong>{entry.version}</strong>
                  <span>{entry.notes}</span>
                </li>
              ))}
            </ul>

            <h3>Update log</h3>
            <pre className="log">{updateLog.length ? updateLog.join('\n') : 'No updates recorded yet.'}</pre>
            <p className="fine-print">
              Updates only remove Xenity's own old caches (<code>/var/cache/xenity-*</code>). Files in
              /Users, your settings and your notes are never deleted.
            </p>
          </>
        )}

        {section === 'about' && (
          <>
            <div className="about">
              <span className="about-mark">
                <XenityMark size={44} />
              </span>
              <h2>Xenity</h2>
              <p className="mono">Version {VERSION} ({CODENAME})</p>
            </div>
            <div className="about-grid">
              <div><span>Kernel</span><strong>xenity-core 1.4.1</strong></div>
              <div><span>Shell</span><strong>xsh 3.2</strong></div>
              <div><span>Window server</span><strong>Xenith</strong></div>
              <div><span>Model</span><strong>Xenity Web Machine</strong></div>
              <div><span>Footprint</span><strong>{formatBytes(stats.system)}</strong></div>
              <div><span>Built</span><strong>14 Nov 2026</strong></div>
            </div>
            <div className="about-download">
              <div>
                <strong>Xenity disc image</strong>
                <p>
                  ISO 9660 · {formatBytes(iso.length)} · launcher page and release notes, mountable anywhere
                </p>
              </div>
              <button
                className="primary"
                onClick={() => {
                  const file = downloadIso(iso)
                  sys.notify('Xenity ISO downloaded', `${file.name} · ${formatBytes(file.size)}`)
                }}
              >
                Download ISO
              </button>
            </div>
            <p className="fine-print">
              Xenity is a real, working operating-system interface: a window manager, a file system, a
              shell and a package store, all running in a single light web process. It is measured in
              kilobytes, not gigabytes.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
