import { useEffect } from 'react'
import { useSystem } from '../os/SystemContext'
import { HOME, baseName, joinPath } from '../os/fs'
import MenuBar from './MenuBar'
import Dock from './Dock'
import Window from './Window'
import Launchpad from './Launchpad'
import Toasts from './Toasts'

export default function Desktop() {
  const sys = useSystem()
  const desktopPath = joinPath(HOME, 'Desktop')

  let entries = []
  try {
    entries = sys.fs.list(desktopPath)
  } catch {
    entries = []
  }

  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.code === 'Space') {
        e.preventDefault()
        sys.setLaunchpadOpen(!sys.launchpadOpen)
      }
      if (meta && e.altKey && e.code === 'KeyT') {
        e.preventDefault()
        sys.openApp('terminal')
      }
      if (meta && e.ctrlKey && e.code === 'KeyQ') {
        e.preventDefault()
        sys.lock()
      }
      if (e.key === 'Escape' && sys.launchpadOpen) sys.setLaunchpadOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sys])

  const openEntry = (entry) => {
    const path = joinPath(desktopPath, entry.name)
    if (entry.type === 'dir') sys.openApp('finder', { path })
    else sys.openApp('editor', { path })
  }

  const filters = []
  if (sys.settings.brightness < 1) filters.push(`brightness(${Number(sys.settings.brightness).toFixed(2)})`)
  if (sys.settings.nightShift) filters.push('sepia(0.18) saturate(1.08)')

  return (
    <div
      className={`desktop wall-${sys.settings.wallpaper}`}
      style={filters.length ? { filter: filters.join(' ') } : undefined}
    >
      <MenuBar />

      <div className="desktop-icons">
        {entries.map((entry) => (
          <button key={entry.name} className="desk-icon" onDoubleClick={() => openEntry(entry)} onClick={(e) => e.currentTarget.focus()}>
            <span className={`desk-glyph ${entry.type}`}>
              {entry.type === 'dir' ? (
                <svg viewBox="0 0 40 32" width="40" height="32" aria-hidden="true">
                  <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h7.2l3 3.5H34.5A2.5 2.5 0 0 1 37 10v15.5A2.5 2.5 0 0 1 34.5 28h-29A2.5 2.5 0 0 1 3 25.5z" fill="#5fb2ff" />
                  <path d="M3 11h34v14.5A2.5 2.5 0 0 1 34.5 28h-29A2.5 2.5 0 0 1 3 25.5z" fill="#8ecbff" />
                </svg>
              ) : (
                <svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true">
                  <path d="M4 3h16l8 8v26H4z" fill="#fff" />
                  <path d="M20 3l8 8h-8z" fill="#d7e6fb" />
                  <path d="M9 17h14M9 22h14M9 27h9" stroke="#9aa7b8" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <span className="desk-label">{entry.type === 'dir' ? entry.name : baseName(entry.name)}</span>
          </button>
        ))}
      </div>

      <div className="windows-layer">
        {sys.windows.filter((w) => !w.minimized).map((win) => (
          <Window key={win.id} win={win} />
        ))}
      </div>

      {sys.launchpadOpen && <Launchpad />}

      <Dock />
      <Toasts />
    </div>
  )
}
