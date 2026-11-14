import { useEffect, useRef } from 'react'
import { SystemProvider, useSystem } from './os/SystemContext'
import Desktop from './components/Desktop'
import { BootScreen, PowerScreen } from './components/Shell'

function Root() {
  const sys = useSystem()
  const announced = useRef(null)

  useEffect(() => {
    if (sys.boot !== 'ready') return
    const key = sys.bootedAt
    if (announced.current === key) return
    announced.current = key
    const info = sys.updateInfo
    if (!info) return
    if (info.updated) {
      sys.notify('Xenity updated', `Now running ${info.current}. Old system caches removed; your files were left alone.`)
    } else if (info.reclaimed > 0) {
      sys.notify('System housekeeping', `Cleaned ${Math.round(info.reclaimed / 1024)} KB of stale Xenity caches. Your files were left alone.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.boot, sys.bootedAt, sys.updateInfo])

  if (sys.boot === 'booting') return <BootScreen />
  if (sys.boot === 'off') return <PowerScreen />
  return <Desktop />
}

export default function App() {
  return (
    <SystemProvider>
      <Root />
    </SystemProvider>
  )
}
