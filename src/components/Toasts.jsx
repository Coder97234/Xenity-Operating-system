import { useSystem } from '../os/SystemContext'
import { Icon } from './Icons'

export default function Toasts() {
  const sys = useSystem()
  return (
    <div className="toasts" aria-live="polite">
      {sys.notifications.map((n) => (
        <div key={n.id} className="toast" role="status" onClick={() => sys.dismissNotification(n.id)}>
          <span className="toast-icon">
            <Icon name="check" size={14} />
          </span>
          <div className="toast-copy">
            <strong>{n.title}</strong>
            {n.body && <span>{n.body}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
