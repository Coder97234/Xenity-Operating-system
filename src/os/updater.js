// Xenity system updater.
//
// On every boot Xenity compares the installed version with the running one and
// removes only its OWN old artefacts: stale /var/cache/xenity-* directories and
// `xenity.system.cache.*` keys. User files (`xenity.user.*`) are never read for
// deletion, so an update can't remove anything the user created.

import { formatBytes } from './fs'

export const VERSION = '1.4.1'
export const CODENAME = 'Nova'
export const BUILD = '2026.11.14'

const VERSION_KEY = 'xenity.system.version'
const SYSTEM_PREFIX = 'xenity.system.'

export const CHANGELOG = [
  { version: '1.4.1', notes: 'Window server: smoother drag + resize, full-screen windows. Terminal: pipes-free shell with pkg, tree, df and neofetch.' },
  { version: '1.4.0', notes: 'Introduced the Xenity Store, Notes, Calculator and Weather.' },
  { version: '1.3.0', notes: 'New file system layout under /Users, /System and /var.' },
]

export function installedVersion() {
  try {
    return localStorage.getItem(VERSION_KEY)
  } catch {
    return null
  }
}

/**
 * Runs the boot-time self-update. Safe to call repeatedly.
 * @returns {{previous: string|null, current: string, updated: boolean, reclaimed: number, removed: string[], log: string, at: string}}
 */
export function runUpdater(fs) {
  const previous = installedVersion()
  const at = new Date()
  const removed = []
  let reclaimed = 0

  // 1. Old system caches on disk. Only directories Xenity itself owns.
  const cacheRoot = '/var/cache'
  try {
    if (!fs.exists(cacheRoot)) fs.mkdir(cacheRoot, { recursive: true })
    if (!fs.exists('/var/log')) fs.mkdir('/var/log', { recursive: true })
    for (const entry of fs.list(cacheRoot)) {
      if (entry.type !== 'dir' || !entry.name.startsWith('xenity-')) continue
      if (entry.name === `xenity-${VERSION}`) continue
      const path = `${cacheRoot}/${entry.name}`
      reclaimed += fs.du(fs.node(path))
      fs.remove(path, { recursive: true })
      removed.push(path)
    }
    const current = `${cacheRoot}/xenity-${VERSION}`
    if (!fs.exists(current)) fs.mkdir(current, { recursive: true })
  } catch {
    /* never let housekeeping block the boot */
  }

  // 2. Old system keys in local storage. `xenity.user.*` is untouched by design.
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(`${SYSTEM_PREFIX}cache.`)) continue
      if (key.endsWith(`.${VERSION}`)) continue
      localStorage.removeItem(key)
      removed.push(key)
    }
    localStorage.setItem(`${SYSTEM_PREFIX}cache.${VERSION}`, at.toISOString())
    localStorage.setItem(VERSION_KEY, VERSION)
  } catch {
    /* private mode: run without persistence */
  }

  const status = previous ? (previous === VERSION ? 'verified' : `upgraded ${previous} -> ${VERSION}`) : `first boot ${VERSION}`
  const log = `[${at.toISOString()}] xenity-update: ${status}; reclaimed ${formatBytes(reclaimed)} of system cache; user data untouched`
  try {
    fs.append('/var/log/update.log', log)
    fs.append('/var/log/system.log', `[update] ${status}`)
  } catch {
    /* ignore */
  }

  return {
    previous,
    current: VERSION,
    updated: !!previous && previous !== VERSION,
    reclaimed,
    removed,
    log,
    at: at.toISOString(),
  }
}
