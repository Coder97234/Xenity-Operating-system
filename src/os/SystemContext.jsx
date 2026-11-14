import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FileSystem, createInitialTree, formatBytes } from './fs'
import { APPS } from './apps'
import { runUpdater, VERSION } from './updater'
import { loadAccount, createAccount as createAccountRecord, verifyPassword, changePassword as changePasswordRecord } from './auth'
import { buildAppList, metaFor, flatpakKey, isFlatpakId } from './appindex'
import { FLATPAK_BY_ID, desktopEntry } from './flatpak'
import { loadVault, newEntryId } from './vault'
import { networkByName, scanNetwork } from './network'

const SystemContext = createContext(null)

export const useSystem = () => useContext(SystemContext)

const SETTINGS_KEY = 'xenity.user.settings'
const PACKAGES_KEY = 'xenity.user.packages'
const FLATPAKS_KEY = 'xenity.user.flatpaks'
const NETWORK_KEY = 'xenity.user.network'

export const DEFAULT_SETTINGS = {
  user: 'xenity',
  theme: 'light',
  accent: '#0a84ff',
  wallpaper: 'aurora',
  brightness: 1,
  nightShift: false,
  reduceMotion: false,
  clock24: false,
  alertVolume: 60,
  alertsMuted: false,
  screensaver: true,
  idleMinutes: 30,
  lockOnIdle: true,
  startupApps: [],
  env: {},
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

function loadList(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

function loadNetwork() {
  try {
    const raw = localStorage.getItem(NETWORK_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const saved = Array.isArray(parsed.saved) ? parsed.saved : []
      const auto = saved.find((entry) => entry.auto)
      return { ssid: parsed.ssid || (auto ? auto.ssid : null), saved }
    }
  } catch {
    /* ignore */
  }
  return { ssid: null, saved: [] }
}

export function SystemProvider({ children }) {
  const fsRef = useRef(null)
  if (!fsRef.current) fsRef.current = FileSystem.load()

  const [fsVersion, setFsVersion] = useState(0)
  const [settings, setSettings] = useState(loadSettings)
  const [packages, setPackages] = useState(() => loadList(PACKAGES_KEY))
  const [flatpaks, setFlatpaks] = useState(() => loadList(FLATPAKS_KEY))
  const [vault, setVault] = useState(loadVault)
  const [network, setNetwork] = useState(loadNetwork)
  const [account, setAccount] = useState(loadAccount)
  const [auth, setAuth] = useState(() => (loadAccount() ? 'locked' : 'setup'))
  const [saver, setSaver] = useState(false)
  const [windows, setWindows] = useState([])
  const [notifications, setNotifications] = useState([])
  const [boot, setBoot] = useState('booting')
  const [updateInfo, setUpdateInfo] = useState(null)
  const [launchpadOpen, setLaunchpadOpen] = useState(false)
  const [bootedAt, setBootedAt] = useState(() => Date.now())

  const zRef = useRef(20)
  const idRef = useRef(0)
  const toastRef = useRef(0)
  const lastActivity = useRef(Date.now())
  const audioRef = useRef(null)

  const commit = useCallback(() => {
    fsRef.current.save()
    setFsVersion((v) => v + 1)
  }, [])

  const chime = useCallback(() => {
    if (settings.alertsMuted || settings.alertVolume <= 0) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      audioRef.current = audioRef.current || new AudioCtx()
      const ctx = audioRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(Math.min(0.16, settings.alertVolume / 700), ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    } catch {
      /* audio unavailable */
    }
  }, [settings.alertVolume, settings.alertsMuted])

  const notify = useCallback(
    (title, body = '') => {
      const id = ++toastRef.current
      setNotifications((list) => [...list, { id, title, body }])
      chime()
      window.setTimeout(() => {
        setNotifications((list) => list.filter((n) => n.id !== id))
      }, 4600)
    },
    [chime]
  )

  const dismissNotification = useCallback((id) => {
    setNotifications((list) => list.filter((n) => n.id !== id))
  }, [])

  const appList = useMemo(() => buildAppList(flatpaks), [flatpaks])
  const appMeta = useCallback((id) => metaFor(id, flatpaks), [flatpaks])

  const openApp = useCallback(
    (appId, payload) => {
      const meta = appMeta(appId)
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
    },
    [appMeta]
  )

  const closeWindow = useCallback((id) => {
    setWindows((list) => list.filter((w) => w.id !== id))
  }, [])

  const focusWindow = useCallback((id) => {
    setWindows((list) => list.map((w) => (w.id === id ? { ...w, z: ++zRef.current, minimized: false } : w)))
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

  /* ── Accounts and session ─────────────────────────────────────────────── */

  const runStartupApps = useCallback(() => {
    const list = settings.startupApps || []
    list.forEach((id) => openApp(id))
  }, [settings.startupApps, openApp])

  const unlock = useCallback(
    async (password) => {
      const ok = await verifyPassword(password)
      if (!ok) return false
      setAuth('unlocked')
      lastActivity.current = Date.now()
      setSaver(false)
      window.setTimeout(runStartupApps, 80)
      return true
    },
    [runStartupApps]
  )

  const createAccount = useCallback(async ({ name, username, password }) => {
    const record = await createAccountRecord({ name, username, password })
    setAccount(record)
    setSettings((s) => ({ ...s, user: record.name || record.username }))
    setAuth('unlocked')
    lastActivity.current = Date.now()
    return record
  }, [])

  const changePassword = useCallback(
    async (current, next) => {
      const result = await changePasswordRecord(current, next)
      if (result.ok) notify('Password changed', 'Use the new password the next time you sign in.')
      return result
    },
    [notify]
  )

  const lock = useCallback(() => {
    if (!account) return
    setAuth('locked')
    setSaver(false)
    setLaunchpadOpen(false)
  }, [account])

  const startScreensaver = useCallback(() => {
    if (!settings.screensaver) {
      notify('Screen saver is off', 'Turn it on in Settings → Display.')
      return
    }
    lastActivity.current = Date.now()
    setSaver(true)
  }, [settings.screensaver, notify])

  const wake = useCallback(() => {
    lastActivity.current = Date.now()
    if (!saver) return
    setSaver(false)
    if (settings.lockOnIdle && account) setAuth('locked')
  }, [saver, settings.lockOnIdle, account])

  /* ── Network ──────────────────────────────────────────────────────────── */

  const connectWifi = useCallback(
    (ssid, password) => {
      const known = networkByName(ssid)
      const secure = known ? known.security !== 'open' : !!password
      if (secure && String(password || '').length < 8) {
        return { ok: false, error: 'That network needs a password of at least 8 characters' }
      }
      setNetwork((n) => ({
        ssid,
        saved: n.saved.some((s) => s.ssid === ssid)
          ? n.saved.map((s) => (s.ssid === ssid ? { ...s, auto: true } : s))
          : [...n.saved, { ssid, auto: true }],
      }))
      if (secure && password) {
        setVault((list) => {
          const existing = list.find((e) => e.type === 'wifi' && e.title === ssid)
          if (existing) return list.map((e) => (e.id === existing.id ? { ...e, password } : e))
          return [
            ...list,
            { id: newEntryId(), type: 'wifi', title: ssid, username: ssid, password, createdAt: Date.now() },
          ]
        })
      }
      notify(`Connected to ${ssid}`, 'Saved — Xenity joins this network automatically on the next boot.')
      return { ok: true }
    },
    [notify]
  )

  const disconnectWifi = useCallback(() => {
    setNetwork((n) => ({ ...n, ssid: null }))
    notify('Wi-Fi disconnected', 'Your saved networks are kept.')
  }, [notify])

  const forgetWifi = useCallback(
    (ssid) => {
      setNetwork((n) => ({ ...n, ssid: n.ssid === ssid ? null : n.ssid, saved: n.saved.filter((s) => s.ssid !== ssid) }))
      setVault((list) => list.filter((e) => !(e.type === 'wifi' && e.title === ssid)))
    },
    []
  )

  /* ── Passwords vault ──────────────────────────────────────────────────── */

  const addCredential = useCallback((entry) => {
    const record = { id: newEntryId(), createdAt: Date.now(), ...entry }
    setVault((list) => [...list, record])
    return record
  }, [])

  const updateCredential = useCallback((id, patch) => {
    setVault((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const removeCredential = useCallback((id) => {
    setVault((list) => list.filter((e) => e.id !== id))
  }, [])

  /* ── Packages ─────────────────────────────────────────────────────────── */

  const isInstalled = useCallback(
    (appId) => {
      if (isFlatpakId(appId)) return flatpaks.includes(appId.replace('flatpak:', ''))
      return !!(APPS[appId]?.preinstalled || packages.includes(appId))
    },
    [packages, flatpaks]
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

  const isFlatpakInstalled = useCallback((id) => flatpaks.includes(id), [flatpaks])

  const installFlatpak = useCallback(
    (pkgId) => {
      const app = FLATPAK_BY_ID[pkgId]
      if (!app) return { ok: false, error: `No such application: ${pkgId}` }
      if (flatpaks.includes(pkgId)) return { ok: false, error: `${app.name} is already installed` }
      setFlatpaks((list) => [...list, pkgId])
      try {
        fsRef.current.write(`/Applications/${pkgId}.desktop`, desktopEntry(app))
        commit()
      } catch {
        /* the store entry is optional */
      }
      notify(`${app.name} installed`, `From Flathub · ${app.size} · runtime ${app.runtime}`)
      return { ok: true, name: app.name, app }
    },
    [flatpaks, notify, commit]
  )

  const uninstallFlatpak = useCallback(
    (pkgId) => {
      const app = FLATPAK_BY_ID[pkgId]
      if (!app) return { ok: false, error: `No such application: ${pkgId}` }
      if (!flatpaks.includes(pkgId)) return { ok: false, error: `${app.name} is not installed` }
      setFlatpaks((list) => list.filter((id) => id !== pkgId))
      try {
        if (fsRef.current.exists(`/Applications/${pkgId}.desktop`)) fsRef.current.remove(`/Applications/${pkgId}.desktop`)
        commit()
      } catch {
        /* ignore */
      }
      setWindows((list) => list.filter((w) => w.appId !== flatpakKey(pkgId)))
      notify(`${app.name} removed`, 'Its sandbox and runtime were cleaned up.')
      return { ok: true, name: app.name }
    },
    [flatpaks, notify, commit]
  )

  /* ── Reset ────────────────────────────────────────────────────────────── */

  const nukeAll = useCallback(() => {
    const fs = fsRef.current
    let files = 0
    try {
      files = fs.walk('/Users').length
    } catch {
      files = 0
    }
    const before = fs.totalSize()
    const next = new FileSystem(createInitialTree())
    next.save()
    fsRef.current = next
    setWindows([])
    setPackages([])
    setFlatpaks([])
    setVault([])
    setNetwork({ ssid: null, saved: [] })
    setSettings({ ...DEFAULT_SETTINGS, user: account?.name || DEFAULT_SETTINGS.user })
    setFsVersion((v) => v + 1)
    notify('Xenity reset', 'Files, apps, passwords and networks cleared. System and default apps kept.')
    return { files, mb: formatBytes(before) }
  }, [notify, account])

  /* ── Boot ─────────────────────────────────────────────────────────────── */

  const bootSequence = useCallback(
    (delay = 1700) => {
      setBoot('booting')
      setWindows([])
      setLaunchpadOpen(false)
      setSaver(false)
      const result = runUpdater(fsRef.current)
      setUpdateInfo(result)
      fsRef.current.save()
      setFsVersion((v) => v + 1)
      setBootedAt(Date.now())
      setAuth(loadAccount() ? 'locked' : 'setup')
      window.setTimeout(() => setBoot('ready'), delay)
    },
    []
  )

  useEffect(() => {
    if (boot === 'booting') bootSequence()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Persistence ──────────────────────────────────────────────────────── */

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.style.setProperty('--accent', settings.accent)
    document.documentElement.dataset.motion = settings.reduceMotion ? 'reduced' : 'full'
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

  useEffect(() => {
    try {
      localStorage.setItem(FLATPAKS_KEY, JSON.stringify(flatpaks))
    } catch {
      /* ignore */
    }
  }, [flatpaks])

  useEffect(() => {
    try {
      localStorage.setItem('xenity.user.vault', JSON.stringify(vault))
    } catch {
      /* ignore */
    }
  }, [vault])

  useEffect(() => {
    try {
      localStorage.setItem(NETWORK_KEY, JSON.stringify(network))
    } catch {
      /* ignore */
    }
  }, [network])

  /* ── Idle & screen saver ──────────────────────────────────────────────── */

  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now()
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
    events.forEach((event) => window.addEventListener(event, bump, { passive: true }))
    return () => events.forEach((event) => window.removeEventListener(event, bump))
  }, [])

  useEffect(() => {
    if (!settings.screensaver || auth !== 'unlocked' || saver) return undefined
    const limit = Math.max(1, Number(settings.idleMinutes) || 30) * 60000
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= limit) setSaver(true)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [settings.screensaver, settings.idleMinutes, auth, saver])

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
    setSaver(false)
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
    flatpaks,
    installFlatpak,
    uninstallFlatpak,
    isFlatpakInstalled,
    appList,
    appMeta,
    account,
    auth,
    saver,
    createAccount,
    unlock,
    lock,
    changePassword,
    wake,
    startScreensaver,
    network,
    networks: scanNetwork(),
    connectWifi,
    disconnectWifi,
    forgetWifi,
    vault,
    addCredential,
    updateCredential,
    removeCredential,
    nukeAll,
    launchpadOpen,
    setLaunchpadOpen,
    powerOff,
    restart: () => bootSequence(),
    powerOn: () => bootSequence(1200),
  }

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>
}
