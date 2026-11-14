// Merged application index: Xenity's built-in apps plus whatever Flatpaks the
// user installed. Keeps APPS metadata lookups working for every window.

import { APP_LIST, APPS } from './apps'
import { FLATPAK_BY_ID } from './flatpak'

export const FLATPAK_PREFIX = 'flatpak:'

export const isFlatpakId = (id) => typeof id === 'string' && id.startsWith(FLATPAK_PREFIX)

export const flatpakKey = (pkgId) => `${FLATPAK_PREFIX}${pkgId}`

export function flatpakMeta(pkgId) {
  const app = FLATPAK_BY_ID[pkgId]
  if (!app) return null
  return {
    id: flatpakKey(pkgId),
    flatpakId: pkgId,
    name: app.name,
    icon: 'flatpak',
    color: app.color,
    letter: app.letter,
    defaultSize: { w: 680, h: 580 },
    description: app.summary,
    tag: app.category,
    preinstalled: false,
    isFlatpak: true,
  }
}

export function buildAppList(flatpaks = []) {
  return [...APP_LIST, ...flatpaks.map(flatpakMeta).filter(Boolean)]
}

export function metaFor(id, flatpaks = []) {
  if (!id) return null
  if (APPS[id]) return APPS[id]
  if (isFlatpakId(id)) return flatpakMeta(id.slice(FLATPAK_PREFIX.length))
  return null
}

export function installedApps(flatpaks = [], packages = []) {
  return buildAppList(flatpaks).filter(
    (app) => !app.hidden && (app.preinstalled || app.isFlatpak || packages.includes(app.id))
  )
}
