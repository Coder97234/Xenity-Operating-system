// Passwords vault.
//
// Entries live in localStorage under `xenity.user.vault` — user data, so the
// updater never removes them. The Passwords app asks for the account password
// before it shows anything.

export const VAULT_KEY = 'xenity.user.vault'

export const VAULT_TYPES = {
  website: 'Website',
  wifi: 'Wi-Fi',
  app: 'App',
}

export function loadVault() {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

export function saveVault(entries) {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(entries))
  } catch {
    /* ignore */
  }
}

export const newEntryId = () => `cred-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export function maskSecret(secret = '') {
  return '•'.repeat(Math.min(24, Math.max(6, String(secret).length)))
}

export function hostOf(url = '') {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
