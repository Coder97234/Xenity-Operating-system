import { useEffect, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { XenityMark } from './Icons'

export default function Screensaver() {
  const sys = useSystem()
  const [now, setNow] = useState(new Date)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    const wake = () => sys.wake()
    window.addEventListener('keydown', wake)
    window.addEventListener('pointerdown', wake)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('keydown', wake)
      window.removeEventListener('pointerdown', wake)
    }
  }, [sys])

  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !sys.settings.clock24,
  })

  return (
    <div className={`saver wall-${sys.settings.wallpaper}`} role="dialog" aria-label="Screen saver">
      <div className="saver-inner">
        <span className="saver-mark">
          <XenityMark size={26} />
        </span>
        <div className="saver-time">{time}</div>
        <div className="saver-date">
          {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <p className="saver-hint">
          <strong>{sys.account?.name || sys.settings.user}</strong> — move the pointer or press a key to wake
        </p>
      </div>
      <button className="saver-wake" onClick={() => sys.wake()} aria-label="Wake the screen">
        Wake
      </button>
    </div>
  )
}
