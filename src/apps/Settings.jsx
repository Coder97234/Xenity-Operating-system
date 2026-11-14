import { useEffect, useMemo, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { formatBytes } from '../os/fs'
import { CHANGELOG, CODENAME, VERSION } from '../os/updater'
import { buildIso, downloadIso } from '../os/iso'
import { Icon, XenityMark, AppGlyph } from '../components/Icons'
import WifiPanel from '../components/WifiPanel'

export const SETTINGS_SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: 'sliders' },
  { id: 'display', label: 'Display', icon: 'monitor' },
  { id: 'sound', label: 'Sound', icon: 'volume' },
  { id: 'network', label: 'Wi-Fi & Network', icon: 'wifi' },
  { id: 'account', label: 'Account', icon: 'user' },
  { id: 'startup', label: 'Startup apps', icon: 'grid' },
  { id: 'datetime', label: 'Date & Time', icon: 'clock' },
  { id: 'storage', label: 'Storage', icon: 'drive' },
  { id: 'updates', label: 'Updates', icon: 'refresh' },
  { id: 'about', label: 'About', icon: 'info' },
]

const ACCENTS = ['#0a84ff', '#ff375f', '#30d158', '#ff9f0a', '#bf5af2', '#64d2ff']
const WALLPAPERS = [
  { id: 'aurora', label: 'Aurora' },
  { id: 'dune', label: 'Dune' },
  { id: 'mint', label: 'Mint' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'blush', label: 'Blush' },
  { id: 'graphite', label: 'Graphite' },
]
const IDLE_CHOICES = [1, 5, 10, 15, 30, 60, 120]

export default function Settings({ win }) {
  const sys = useSystem()
  const [section, setSection] = useState(win?.payload?.section || 'appearance')
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMessage, setPwMessage] = useState('')
  const [confirmNuke, setConfirmNuke] = useState(false)

  useEffect(() => {
    if (win?.payload?.section) setSection(win.payload.section)
  }, [win?.payload?.section])

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

  const updateLog = useMemo(() => {
    try {
      return sys.fs.read('/var/log/update.log').trim().split('\n').filter(Boolean)
    } catch {
      return []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.fsVersion])

  const iso = useMemo(() => buildIso(), [])
  const installedApps = sys.appList.filter((app) => !app.hidden && sys.isInstalled(app.id))
  const startupApps = sys.settings.startupApps || []

  const submitPassword = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) {
      setPwMessage('The new passwords do not match.')
      return
    }
    const result = await sys.changePassword(pw.current, pw.next)
    if (!result.ok) {
      setPwMessage(result.error)
      return
    }
    setPw({ current: '', next: '', confirm: '' })
    setPwMessage('Password changed.')
  }

  const toggleStartup = (id) => {
    sys.updateSettings({
      startupApps: startupApps.includes(id) ? startupApps.filter((app) => app !== id) : [...startupApps, id],
    })
  }

  return (
    <div className="set">
      <aside className="set-side">
        <div className="set-user">
          <span className="avatar">{(sys.account?.name || sys.settings.user).slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{sys.account?.name || sys.settings.user}</strong>
            <small>@{sys.account?.username || 'xenity'}</small>
          </div>
        </div>
        {SETTINGS_SECTIONS.map((s) => (
          <button key={s.id} className={section === s.id ? 'active' : ''} onClick={() => setSection(s.id)}>
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

            <div className="set-row">
              <div>
                <strong>Reduce motion</strong>
                <p>Turns off window and Dock animations for a calmer desktop.</p>
              </div>
              <button
                className={`switch ${sys.settings.reduceMotion ? 'on' : ''}`}
                role="switch"
                aria-checked={sys.settings.reduceMotion}
                aria-label="Reduce motion"
                onClick={() => sys.updateSettings({ reduceMotion: !sys.settings.reduceMotion })}
              >
                <i />
              </button>
            </div>
          </>
        )}

        {section === 'display' && (
          <>
            <h2>Display</h2>
            <div className="set-row column">
              <div className="set-row-head">
                <div>
                  <strong>Brightness</strong>
                  <p>Dims the whole desktop, windows included.</p>
                </div>
                <span className="mono">{Math.round(sys.settings.brightness * 100)}%</span>
              </div>
              <input
                className="range"
                type="range"
                min="40"
                max="100"
                value={Math.round(sys.settings.brightness * 100)}
                onChange={(e) => sys.updateSettings({ brightness: Number(e.target.value) / 100 })}
                aria-label="Brightness"
              />
            </div>

            <div className="set-row">
              <div>
                <strong>Night Shift</strong>
                <p>Warmer colours in the evening.</p>
              </div>
              <button
                className={`switch ${sys.settings.nightShift ? 'on' : ''}`}
                role="switch"
                aria-checked={sys.settings.nightShift}
                aria-label="Night Shift"
                onClick={() => sys.updateSettings({ nightShift: !sys.settings.nightShift })}
              >
                <i />
              </button>
            </div>

            <div className="set-row">
              <div>
                <strong>Resolution</strong>
                <p>Reported by the machine — Xenity renders to the window it is given.</p>
              </div>
              <span className="mono">
                {window.screen.width} × {window.screen.height}
              </span>
            </div>

            <h3>Screen saver &amp; idle</h3>
            <div className="set-row">
              <div>
                <strong>Screen saver</strong>
                <p>Show the clock after a period without input.</p>
              </div>
              <button
                className={`switch ${sys.settings.screensaver ? 'on' : ''}`}
                role="switch"
                aria-checked={sys.settings.screensaver}
                aria-label="Screen saver"
                onClick={() => sys.updateSettings({ screensaver: !sys.settings.screensaver })}
              >
                <i />
              </button>
            </div>

            <div className="set-row">
              <div>
                <strong>Start after</strong>
                <p>Idle time before the screen saver takes over.</p>
              </div>
              <select
                className="text-input"
                value={sys.settings.idleMinutes}
                onChange={(e) => sys.updateSettings({ idleMinutes: Number(e.target.value) })}
                aria-label="Idle minutes"
                disabled={!sys.settings.screensaver}
              >
                {IDLE_CHOICES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hour${minutes > 60 ? 's' : ''}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="set-row">
              <div>
                <strong>Require password after screen saver</strong>
                <p>Wake up to the Xenity login screen.</p>
              </div>
              <button
                className={`switch ${sys.settings.lockOnIdle ? 'on' : ''}`}
                role="switch"
                aria-checked={sys.settings.lockOnIdle}
                aria-label="Require password after screen saver"
                onClick={() => sys.updateSettings({ lockOnIdle: !sys.settings.lockOnIdle })}
              >
                <i />
              </button>
            </div>

            <button className="ghost" onClick={() => sys.startScreensaver()}>
              Start screen saver now
            </button>
          </>
        )}

        {section === 'sound' && (
          <>
            <h2>Sound</h2>
            <div className="set-row column">
              <div className="set-row-head">
                <div>
                  <strong>Alert volume</strong>
                  <p>Chime played when Xenity sends a notification.</p>
                </div>
                <span className="mono">{sys.settings.alertsMuted ? 'Muted' : `${sys.settings.alertVolume}%`}</span>
              </div>
              <input
                className="range"
                type="range"
                min="0"
                max="100"
                step="5"
                value={sys.settings.alertVolume}
                onChange={(e) => sys.updateSettings({ alertVolume: Number(e.target.value) })}
                aria-label="Alert volume"
                disabled={sys.settings.alertsMuted}
              />
            </div>
            <div className="set-row">
              <div>
                <strong>Mute alerts</strong>
                <p>Silences notification chimes. Toasts still appear.</p>
              </div>
              <button
                className={`switch ${sys.settings.alertsMuted ? 'on' : ''}`}
                role="switch"
                aria-checked={sys.settings.alertsMuted}
                aria-label="Mute alerts"
                onClick={() => sys.updateSettings({ alertsMuted: !sys.settings.alertsMuted })}
              >
                <i />
              </button>
            </div>
            <button className="ghost" onClick={() => sys.notify('Sound check', 'This is the Xenity alert chime.')}>
              Play a test alert
            </button>
          </>
        )}

        {section === 'network' && (
          <>
            <h2>Wi-Fi &amp; Network</h2>
            <WifiPanel />
          </>
        )}

        {section === 'account' && (
          <>
            <h2>Account</h2>
            <div className="set-row">
              <div>
                <strong>Full name</strong>
                <p>Shown in the menu bar, login screen and terminal prompt.</p>
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
                <strong>User name</strong>
                <p>Your home folder is /Users/{sys.account?.username || sys.settings.user}.</p>
              </div>
              <span className="mono">@{sys.account?.username || 'xenity'}</span>
            </div>

            <h3>Change password</h3>
            <form className="pw-form" onSubmit={submitPassword}>
              <label className="field">
                <span>Current password</span>
                <input
                  type="password"
                  value={pw.current}
                  onChange={(e) => {
                    setPw({ ...pw, current: e.target.value })
                    setPwMessage('')
                  }}
                  aria-label="Current password"
                />
              </label>
              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  value={pw.next}
                  onChange={(e) => {
                    setPw({ ...pw, next: e.target.value })
                    setPwMessage('')
                  }}
                  aria-label="New password"
                />
              </label>
              <label className="field">
                <span>Confirm new password</span>
                <input
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => {
                    setPw({ ...pw, confirm: e.target.value })
                    setPwMessage('')
                  }}
                  aria-label="Confirm new password"
                />
              </label>
              {pwMessage && <p className={pwMessage === 'Password changed.' ? 'field-ok' : 'field-error'}>{pwMessage}</p>}
              <button className="primary" type="submit" disabled={!pw.current || !pw.next}>
                Change password
              </button>
            </form>

            <div className="set-row">
              <div>
                <strong>Lock screen</strong>
                <p>Requires your password again to get back in.</p>
              </div>
              <button className="ghost" onClick={() => sys.lock()}>
                Lock now
              </button>
            </div>
          </>
        )}

        {section === 'startup' && (
          <>
            <h2>Startup apps</h2>
            <p className="set-lede">These apps open by themselves right after you sign in.</p>
            <div className="startup-list">
              {installedApps.map((app) => (
                <div key={app.id} className="startup-row">
                  <AppGlyph appId={app.icon} size={30} color={app.color} letter={app.letter} />
                  <span>{app.name}</span>
                  <button
                    className={`switch ${startupApps.includes(app.id) ? 'on' : ''}`}
                    role="switch"
                    aria-checked={startupApps.includes(app.id)}
                    aria-label={`Open ${app.name} at login`}
                    onClick={() => toggleStartup(app.id)}
                  >
                    <i />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'datetime' && (
          <>
            <h2>Date &amp; Time</h2>
            <div className="set-row">
              <div>
                <strong>Time now</strong>
                <p>{new Date().toLocaleString()}</p>
              </div>
              <span className="mono">
                {new Date().toLocaleTimeString(undefined, { hour12: !sys.settings.clock24 })}
              </span>
            </div>
            <div className="set-row">
              <div>
                <strong>24-hour clock</strong>
                <p>Uses the same setting in the menu bar and screen saver.</p>
              </div>
              <button
                className={`switch ${sys.settings.clock24 ? 'on' : ''}`}
                role="switch"
                aria-checked={sys.settings.clock24}
                aria-label="24-hour clock"
                onClick={() => sys.updateSettings({ clock24: !sys.settings.clock24 })}
              >
                <i />
              </button>
            </div>
            <div className="set-row">
              <div>
                <strong>Time zone</strong>
                <p>Xenity follows this computer's clock.</p>
              </div>
              <span className="mono">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
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
                <p>Files, settings, Flatpaks and passwords, kept on this machine only.</p>
              </div>
              <span className="mono">{formatBytes(stats.storage)}</span>
            </div>
            <div className="set-row">
              <div>
                <strong>Installed applications</strong>
                <p>Xenity apps plus Flatpaks from Flathub.</p>
              </div>
              <span className="mono">{sys.packages.length + sys.flatpaks.length + installedApps.length} apps</span>
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

            <h3 className="danger-heading">Nuke all</h3>
            <div className="nuke-card">
              <div>
                <strong>Reset this machine</strong>
                <p>
                  Deletes your files, notes, installed apps and Flatpaks, saved passwords and Wi-Fi
                  networks. The system and the default apps stay, and so does your account.
                </p>
              </div>
              {confirmNuke ? (
                <div className="nuke-confirm">
                  <button className="ghost" onClick={() => setConfirmNuke(false)}>
                    Cancel
                  </button>
                  <button
                    className="primary danger"
                    onClick={() => {
                      const result = sys.nukeAll()
                      setConfirmNuke(false)
                      sys.notify('Xenity nuked', `${result.mb} of your data removed. System and default apps kept.`)
                    }}
                  >
                    Nuke everything
                  </button>
                </div>
              ) : (
                <button className="ghost danger" onClick={() => setConfirmNuke(true)}>
                  Nuke all…
                </button>
              )}
            </div>
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
              /Users, your settings, passwords and notes are never deleted.
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
                  ISO 9660 + El Torito · {formatBytes(iso.length)} · bootable launcher disc
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
              shell, a package store and Flatpak support, all running in a single light web process. It is
              measured in kilobytes, not gigabytes.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
