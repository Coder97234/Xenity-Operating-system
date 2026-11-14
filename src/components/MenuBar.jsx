import { useEffect, useRef, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { Icon, XenityMark } from './Icons'
import WifiPanel from './WifiPanel'
import { downloadIso } from '../os/iso'
import { formatBytes } from '../os/fs'

function Menu({ label, items, open, onToggle, bold }) {
  return (
    <div className="mb-menu">
      <button className={`mb-item ${bold ? 'bold' : ''} ${open ? 'open' : ''}`} onClick={onToggle}>
        {label}
      </button>
      {open && (
        <div className="mb-dropdown" role="menu">
          {items.map((item, i) =>
            item.separator ? (
              <div className="mb-sep" key={`sep-${i}`} />
            ) : (
              <button
                key={item.label}
                role="menuitem"
                className="mb-dd-item"
                disabled={item.disabled}
                onClick={() => {
                  onToggle()
                  item.onSelect()
                }}
              >
                <span>{item.label}</span>
                {item.hint && <span className="hint">{item.hint}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default function MenuBar() {
  const sys = useSystem()
  const [open, setOpen] = useState(null)
  const [wifiOpen, setWifiOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const barRef = useRef(null)

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 15000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    const onDown = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpen(null)
        setWifiOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const active = sys.activeWindow
  const activeName = active ? sys.appMeta(active.appId)?.name : 'Finder'

  const clock = now.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: !sys.settings.clock24,
  })

  const menus = {
    xenity: [
      { label: 'About This Xenity', onSelect: () => sys.openApp('settings', { section: 'about' }) },
      { label: 'System Settings…', onSelect: () => sys.openApp('settings') },
      {
        label: 'Xenity Store…',
        onSelect: () => sys.openApp('store'),
      },
      { label: 'Passwords…', onSelect: () => sys.openApp('passwords') },
      {
        label: 'Download ISO…',
        onSelect: () => {
          const file = downloadIso()
          sys.notify('Xenity ISO downloaded', `${file.name} · ${formatBytes(file.size)}`)
        },
      },
      { separator: true },
      { label: 'Lock Screen', hint: '⌃⌘Q', disabled: !sys.account, onSelect: () => sys.lock() },
      { label: 'Start Screen Saver', onSelect: () => sys.startScreensaver() },
      { separator: true },
      { label: 'Restart…', onSelect: () => sys.restart() },
      { label: 'Shut Down…', onSelect: () => sys.powerOff() },
    ],
    file: [
      { label: 'New Finder Window', onSelect: () => sys.openApp('finder') },
      { label: 'Open Terminal', hint: '⌃⌥T', onSelect: () => sys.openApp('terminal') },
      { separator: true },
      { label: active ? `Close ${activeName}` : 'Close Window', disabled: !active, onSelect: () => active && sys.closeWindow(active.id) },
    ],
    view: [
      { label: 'Show Launchpad', hint: '⌘Space', onSelect: () => sys.setLaunchpadOpen(true) },
      { label: 'Toggle Theme', onSelect: () => sys.updateSettings({ theme: sys.settings.theme === 'light' ? 'dark' : 'light' }) },
      { label: 'Toggle Night Shift', onSelect: () => sys.updateSettings({ nightShift: !sys.settings.nightShift }) },
    ],
    window: [
      {
        label: 'Minimise',
        disabled: !active,
        onSelect: () => active && sys.minimizeWindow(active.id),
      },
      {
        label: 'Zoom',
        disabled: !active,
        onSelect: () => active && sys.toggleMaximize(active.id),
      },
    ],
    help: [
      { label: 'Xenity Help', onSelect: () => sys.openApp('browser', { url: 'xenity://docs' }) },
      { label: 'About This Xenity', onSelect: () => sys.openApp('settings', { section: 'about' }) },
    ],
  }

  const online = !!sys.network.ssid

  return (
    <header className="menubar" ref={barRef}>
      <div className="mb-left">
        <Menu
          label={<XenityMark size={14} />}
          items={menus.xenity}
          open={open === 'xenity'}
          onToggle={() => setOpen(open === 'xenity' ? null : 'xenity')}
        />
        <span className="mb-app-name">{activeName}</span>
        <Menu label="File" items={menus.file} open={open === 'file'} onToggle={() => setOpen(open === 'file' ? null : 'file')} />
        <Menu label="View" items={menus.view} open={open === 'view'} onToggle={() => setOpen(open === 'view' ? null : 'view')} />
        <Menu label="Window" items={menus.window} open={open === 'window'} onToggle={() => setOpen(open === 'window' ? null : 'window')} />
        <Menu label="Help" items={menus.help} open={open === 'help'} onToggle={() => setOpen(open === 'help' ? null : 'help')} />
      </div>
      <div className="mb-right">
        <span className="mb-status" title="Battery 100%">
          <Icon name="battery" size={17} />
        </span>
        <div className="mb-menu">
          <button
            className={`mb-status mb-network ${online ? 'on' : 'off'} ${wifiOpen ? 'open' : ''}`}
            title={online ? `Wi-Fi: ${sys.network.ssid}` : 'Wi-Fi is off'}
            aria-label="Wi-Fi"
            onClick={() => {
              setOpen(null)
              setWifiOpen(!wifiOpen)
            }}
          >
            <Icon name="wifi" size={16} />
          </button>
          {wifiOpen && (
            <div className="mb-popover wifi-popover">
              <WifiPanel compact />
              <button
                className="ghost"
                onClick={() => {
                  setWifiOpen(false)
                  sys.openApp('settings', { section: 'network' })
                }}
              >
                Network settings…
              </button>
            </div>
          )}
        </div>
        <span className="mb-status" title="Control Centre">
          <Icon name="sliders" size={16} />
        </span>
        <span className="mb-clock">{clock}</span>
      </div>
    </header>
  )
}
