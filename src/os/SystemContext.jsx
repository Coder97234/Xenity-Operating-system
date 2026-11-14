import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FileSystem } from './fs'
import { APPS } from './apps'
import { runUpdater, VERSION } from './updater'

const SystemContext = createContext(null)

export const useSystem = () => useContext(SystemContext)

const SETTINGS_KEY = 'xenity.user.settings'
const PACKAGES_KEY = 'xenity.user.packages'

const DEFAULT_SETTINGS = {
  user: 'xenity',
  theme: 'light',
  accent: '#0a84ff',
  wallpaper: 'aurora',
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS }
}

function loadPackages() {
  try {
    const raw = localStorage.getItem(PACKAGES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

export function SystemProvider({ children }) {
  const fsRef = useRef(null)
  if (!fsRef.current) fsRef.current = FileSystem.load()

  const [fsVersion, setFsVersion] = useState(0)
  const [settings, setSettings] = useState(loadSettings)
  const [packages, setPackages] = useState(loadPackages)
  const [windows, setWindows] = useState([])
  const [notifications, setNotifications] = useState([])
  const [boot, setBoot] = useState('booting')
  const [updateInfo, setUpdateInfo] = useState(null)
  const [launchpadOpen, setLaunchpadOpen] = useState(false)
  const [bootedAt, setBootedAt] = useState(() => Date.now())

  const zRef = useRef(20)
  const idRef = useRef(0)
  const toastRef = useRef(0)

  const commit = useCallback(() => {
    fsRef.current.save()
    setFsVersion((v) => v + 1)
  }, [])

  const notify = useCallback((title, body = '') => {
    const id = ++toastRef.current
    setNotifications((list) => [...list, { id, title, body }])
    window.setTimeout(() => {
      setNotifications((list) => list.filter((n) => n.id !== id))
    }, 4600)
  }, [])

  const dismissNotification = useCallback((id) => {
    setNotifications((list) => list.filter((n) => n.id !== id))
  }, [])

  const openApp = useCallback((appId, payload) => {
    const meta = APPS[appId]
    if (!meta) return
    const key = payload?.path ? `${appId}:${payload.path}` : appId
    setWindows((prev) => {
      const existing = prev.find((w) => w.key === key)
      if (existing) {
        return prev.map((w) =>
          w.key === key ? { ...w, payload: payload ?? w.payload, minimized: false, z: ++zRef.current } : w
        )
      }
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = Math.min(meta.defaultSize.w, Math.max(320, vw - 48))
      const h = Math.min(meta.defaultSize.h, Math.max(240, vh - 120))
      const offset = (prev.length % 5) * 26
      const x = Math.max(12, Math.round((vw - w) / 2) - 40 + offset)
      const y = Math.max(42, Math.round((vh - h) / 2.2) + offset - 20)
      return [
        ...prev,
        {
          id: `win-${++idRef.current}`,
          key,
          appId,
          x,
          y,
          w,
          h,
          z: ++zRef.current,
          minimized: false,
          maximized: false,
          payload,
        },
      ]
    })
    setLaunchpadOpen(false)
  }, [])

  const closeWindow = useCallback((id) => {
    setWindows((list) => list.filter((w) => w.id !== id))
  }, [])

  const focusWindow = useCallback((id) => {
    setWindows((list) =>
      list.map((w) => (w.id === id ? { ...w, z: ++zRef.current, minimized: false } : w))
    )
  }, [])

  const minimizeWindow = useCallback((id) => {
    setWindows((list) => list.map((w) => (w.id === id ? { ...w, minimized: true } : w)))
  }, [])

  const toggleMaximize = useCallback((id) => {
    setWindows((list) =>
      list.map((w) => (w.id === id ? { ...w, maximized: !w.maximized, z: ++zRef.current } : w))
    )
  }, [])

  const setBounds = useCallback((id, bounds) => {
    setWindows((list) => list.map((w) => (w.id === id ? { ...w, ...bounds } : w)))
  }, [])

  const updateSettings = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  const isInstalled = useCallback(
    (appId) => !!(APPS[appId]?.preinstalled || packages.includes(appId)),
    [packages]
  )

  const installPkg = useCallback(
    (appId) => {
      const meta = APPS[appId]
      if (!meta) return { ok: false, error: `Unknown package: ${appId}` }
      if (meta.preinstalled || packages.includes(appId)) {
        return { ok: false, error: `${meta.name} is already installed` }
      }
      setPackages((list) => [...list, appId])
      notify(`${meta.name} installed`, 'Added to the Dock and Launchpad.')
      return { ok: true, name: meta.name }
    },
    [packages, notify]
  )

  const uninstallPkg = useCallback(
    (appId) => {
      const meta = APPS[appId]
      if (!meta) return { ok: false, error: `Unknown package: ${appId}` }
      if (meta.preinstalled) return { ok: false, error: `${meta.name} is part of the system` }
      setPackages((list) => list.filter((id) => id !== appId))
      setWindows((list) => list.filter((w) => w.appId !== appId))
      notify(`${meta.name} removed`, 'You can reinstall it from the Store.')
      return { ok: true, name: meta.name }
    },
    [notify]
  )

  const bootSequence = useCallback(
    (delay = 1700) => {
      setBoot('booting')
      setWindows([])
      setLaunchpadOpen(false)
      const result = runUpdater(fsRef.current)
      setUpdateInfo(result)
      fsRef.current.save()
      setFsVersion((v) => v + 1)
      setBootedAt(Date.now())
      window.setTimeout(() => setBoot('ready'), delay)
    },
    []
  )

  useEffect(() => {
    if (boot === 'booting') bootSequence()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.style.setProperty('--accent', settings.accent)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  }, [settings])

  useEffect(() => {
    try {
      localStorage.setItem(PACKAGES_KEY, JSON.stringify(packages))
    } catch {
      /* ignore */
    }
  }, [packages])

  const runSystemUpdate = useCallback(() => {
    const result = runUpdater(fsRef.current)
    setUpdateInfo(result)
    fsRef.current.save()
    setFsVersion((v) => v + 1)
    return result
  }, [])

  const powerOff = useCallback(() => {
    setBoot('off')
    setWindows([])
    setLaunchpadOpen(false)
  }, [])

  const activeWindow = useMemo(() => {
    const visible = windows.filter((w) => !w.minimized)
    if (!visible.length) return null
    return visible.reduce((top, w) => (w.z > top.z ? w : top), visible[0])
  }, [windows])

  const value = {
    boot,
    bootedAt,
    version: VERSION,
    updateInfo,
    runSystemUpdate,
    settings,
    updateSettings,
    fs: fsRef.current,
    fsVersion,
    commit,
    windows,
    activeWindow,
    openApp,
    closeWindow,
    focusWindow,
    minimizeWindow,
    toggleMaximize,
    setBounds,
    notifications,
    notify,
    dismissNotification,
    packages,
    installPkg,
    uninstallPkg,
    isInstalled,
    launchpadOpen,
    setLaunchpadOpen,
    powerOff,
    restart: () => bootSequence(),
    powerOn: () => bootSequence(1200),
  }

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>
}
