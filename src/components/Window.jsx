import { useRef } from 'react'
import { useSystem } from '../os/SystemContext'
import { componentFor } from '../os/registry'
import { baseName } from '../os/fs'

const MIN_W = 280
const MIN_H = 200

export default function Window({ win }) {
  const sys = useSystem()
  const meta = sys.appMeta(win.appId)
  const Component = componentFor(win.appId)
  const active = sys.activeWindow?.id === win.id
  const dragRef = useRef(null)

  if (!meta || !Component) return null

  const title = win.appId === 'editor' && win.payload?.path ? baseName(win.payload.path) : meta.name

  const startDrag = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('.traffic') || e.target.closest('button')) return
    sys.focusWindow(win.id)
    if (win.maximized) return
    const start = { x: e.clientX, y: e.clientY, ox: win.x, oy: win.y }
    const move = (ev) => {
      sys.setBounds(win.id, {
        x: Math.min(Math.max(-win.w + 140, start.ox + ev.clientX - start.x), window.innerWidth - 140),
        y: Math.min(Math.max(30, start.oy + ev.clientY - start.y), window.innerHeight - 70),
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startResize = (e) => {
    e.stopPropagation()
    if (win.maximized) return
    sys.focusWindow(win.id)
    const start = { x: e.clientX, y: e.clientY, w: win.w, h: win.h }
    const min = meta.minSize || { w: MIN_W, h: MIN_H }
    const move = (ev) => {
      sys.setBounds(win.id, {
        w: Math.max(min.w, Math.min(start.w + ev.clientX - start.x, window.innerWidth - win.x - 8)),
        h: Math.max(min.h, Math.min(start.h + ev.clientY - start.y, window.innerHeight - win.y - 8)),
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const style = win.maximized
    ? { left: 0, top: 28, width: '100%', height: 'calc(100% - 28px)', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  return (
    <section
      className={`win ${active ? 'active' : 'inactive'} ${win.maximized ? 'maximized' : ''}`}
      style={style}
      onPointerDown={() => sys.focusWindow(win.id)}
      aria-label={title}
    >
      <div className="win-titlebar" onPointerDown={startDrag} onDoubleClick={() => sys.toggleMaximize(win.id)}>
        <div className="traffic">
          <button className="tl close" onClick={() => sys.closeWindow(win.id)} aria-label="Close">
            <svg viewBox="0 0 8 8" width="7" height="7"><path d="M1.6 1.6l4.8 4.8M6.4 1.6 1.6 6.4" stroke="#5c1a15" strokeWidth="1.2" strokeLinecap="round" /></svg>
          </button>
          <button className="tl min" onClick={() => sys.minimizeWindow(win.id)} aria-label="Minimise">
            <svg viewBox="0 0 8 8" width="7" height="7"><path d="M1.6 4h4.8" stroke="#6a4a00" strokeWidth="1.2" strokeLinecap="round" /></svg>
          </button>
          <button className="tl zoom" onClick={() => sys.toggleMaximize(win.id)} aria-label="Full screen">
            <svg viewBox="0 0 8 8" width="7" height="7"><path d="M2.2 2.2l3.6 3.6M5.8 2.2 2.2 5.8" stroke="#0b4a16" strokeWidth="1.2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="win-title">{title}</div>
        <div className="win-spacer" />
      </div>
      <div className="win-body">
        <Component win={win} />
      </div>
      {!win.maximized && <div className="win-resize" onPointerDown={startResize} />}
    </section>
  )
}
