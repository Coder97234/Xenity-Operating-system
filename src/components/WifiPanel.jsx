import { useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { Icon, AppGlyph } from './Icons'

function SignalBars({ strength = 0 }) {
  return (
    <span className={`sig sig-${strength}`} aria-label={`Signal ${strength} of 4`}>
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

export default function WifiPanel({ compact = false }) {
  const sys = useSystem()
  const [joining, setJoining] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [manual, setManual] = useState(false)
  const [manualSsid, setManualSsid] = useState('')
  const [manualPassword, setManualPassword] = useState('')

  const connected = sys.network.ssid
  const savedFor = (ssid) => sys.network.saved.find((s) => s.ssid === ssid)

  const join = (network) => {
    const result = sys.connectWifi(network.ssid, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setJoining(null)
    setPassword('')
    setError('')
  }

  const addManual = (e) => {
    e.preventDefault()
    const ssid = manualSsid.trim()
    if (!ssid) return setError('Enter the network name.')
    const result = sys.connectWifi(ssid, manualPassword)
    if (!result.ok) return setError(result.error)
    setManual(false)
    setManualSsid('')
    setManualPassword('')
    setError('')
  }

  return (
    <div className={`wifi-panel ${compact ? 'compact' : ''}`}>
      <div className="wifi-head">
        <div>
          <strong>Wi-Fi</strong>
          <p>{connected ? `Connected to ${connected}` : 'Wi-Fi is off'}</p>
        </div>
        <SignalBars strength={connected ? sys.networks.find((n) => n.ssid === connected)?.signal || 3 : 0} />
      </div>

      <div className="wifi-list">
        {sys.networks.map((network) => {
          const isConnected = connected === network.ssid
          const saved = savedFor(network.ssid)
          const secure = network.security !== 'open'
          return (
            <div key={network.ssid} className={`wifi-row ${isConnected ? 'connected' : ''}`}>
              <button
                className="wifi-main"
                onClick={() => {
                  if (isConnected) return
                  if (secure && !saved) {
                    setJoining(joining === network.ssid ? null : network.ssid)
                    setPassword('')
                    setError('')
                    return
                  }
                  sys.connectWifi(network.ssid, password)
                }}
              >
                <SignalBars strength={network.signal} />
                <span className="wifi-name">
                  {network.ssid}
                  {saved && <small>{saved.auto ? 'joins automatically' : 'saved'}</small>}
                </span>
                {secure && <Icon name="lock" size={13} />}
                {isConnected && <span className="wifi-state">Connected</span>}
              </button>

              {joining === network.ssid && (
                <form
                  className="wifi-join"
                  onSubmit={(e) => {
                    e.preventDefault()
                    join(network)
                  }}
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`Password for ${network.ssid}`}
                    aria-label={`Password for ${network.ssid}`}
                    autoFocus
                  />
                  <button className="pill" type="submit">
                    Join
                  </button>
                </form>
              )}

              {isConnected && (
                <div className="wifi-actions">
                  <button className="link-btn" onClick={() => sys.disconnectWifi()}>
                    Disconnect
                  </button>
                  {saved && (
                    <button className="link-btn" onClick={() => sys.forgetWifi(network.ssid)}>
                      Forget
                    </button>
                  )}
                </div>
              )}
              {!isConnected && saved && (
                <div className="wifi-actions">
                  <button className="link-btn" onClick={() => sys.forgetWifi(network.ssid)}>
                    Forget
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {manual ? (
        <form className="wifi-manual" onSubmit={addManual}>
          <input
            value={manualSsid}
            onChange={(e) => setManualSsid(e.target.value)}
            placeholder="Network name (SSID)"
            aria-label="Network name"
          />
          <input
            type="password"
            value={manualPassword}
            onChange={(e) => setManualPassword(e.target.value)}
            placeholder="Password"
            aria-label="Network password"
          />
          <button className="primary" type="submit">
            Join hidden network
          </button>
        </form>
      ) : (
        <button className="ghost wifi-add" onClick={() => setManual(true)}>
          Join another network…
        </button>
      )}

      {error && <p className="field-error">{error}</p>}

      {!compact && (
        <div className="wifi-details">
          <div>
            <span>Saved networks</span>
            <strong>{sys.network.saved.length}</strong>
          </div>
          <div>
            <span>Auto-connect</span>
            <strong>{sys.network.saved.some((s) => s.auto) ? 'On' : 'Off'}</strong>
          </div>
          <div>
            <span>IP address</span>
            <strong>{connected ? '192.168.1.24' : '—'}</strong>
          </div>
          <div>
            <span>Adapter</span>
            <strong>wlan0</strong>
          </div>
        </div>
      )}

      {!compact && (
        <div className="vault-hint">
          <AppGlyph appId="passwords" size={30} />
          <p>Wi-Fi passwords are kept in the Passwords app, protected by your account password.</p>
        </div>
      )}
    </div>
  )
}
