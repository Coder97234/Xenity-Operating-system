import { XenityMark } from './Icons'
import { Icon } from './Icons'
import { useSystem } from '../os/SystemContext'
import { CODENAME, VERSION } from '../os/updater'

export function BootScreen() {
  return (
    <div className="boot-screen">
      <div className="boot-mark">
        <XenityMark size={46} />
      </div>
      <h1 className="boot-name">Xenity</h1>
      <div className="boot-bar">
        <i />
      </div>
      <p className="boot-version">
        Version {VERSION} ({CODENAME})
      </p>
    </div>
  )
}

export function PowerScreen() {
  const sys = useSystem()
  return (
    <div className="power-screen">
      <button className="power-button" onClick={sys.powerOn} aria-label="Power on">
        <Icon name="power" size={30} strokeWidth={1.6} />
      </button>
      <p>Xenity is shut down</p>
      <span>Press the power button to start up.</span>
    </div>
  )
}
