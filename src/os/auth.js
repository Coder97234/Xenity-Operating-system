// Xenity accounts.
//
// The account lives in localStorage under `xenity.user.account` (user data, so
// the updater never touches it). Only a salted hash of the password is stored.

const ACCOUNT_KEY = 'xenity.user.account'
const enc = new TextEncoder()

const hex = (bytes) => Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('')

function randomSalt() {
  try {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return hex(bytes)
  } catch {
    return Math.random().toString(16).slice(2) + Date.now().toString(16)
  }
}

function fallbackHash(text) {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < text.length; i += 1) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0
    h2 = Math.imul(h2 + text.charCodeAt(i) * (i + 7), 2654435761) >>> 0
  }
  return `x1${h1.toString(16)}${h2.toString(16)}`
}

async function hashPassword(password, salt) {
  const text = `${salt}::${password}`
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      return hex(await crypto.subtle.digest('SHA-256', enc.encode(text)))
    }
  } catch {
    /* fall through to the local hash */
  }
  return fallbackHash(text)
}

export function loadAccount() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.username && parsed.hash && parsed.salt) return parsed
  } catch {
    /* ignore */
  }
  return null
}

function saveAccount(account) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account))
  } catch {
    /* ignore */
  }
}

export async function createAccount({ name, username, password }) {
  const salt = randomSalt()
  const account = {
    name: name.trim() || username.trim(),
    username: username.trim().toLowerCase(),
    salt,
    hash: await hashPassword(password, salt),
    createdAt: Date.now(),
  }
  saveAccount(account)
  return account
}

export async function verifyPassword(password) {
  const account = loadAccount()
  if (!account) return false
  return (await hashPassword(password, account.salt)) === account.hash
}

export async function setPassword(password) {
  const account = loadAccount()
  if (!account) return { ok: false, error: 'No account on this machine' }
  const salt = randomSalt()
  saveAccount({ ...account, salt, hash: await hashPassword(password, salt) })
  return { ok: true }
}

export async function changePassword(current, next) {
  if (!(await verifyPassword(current))) return { ok: false, error: 'Current password is incorrect' }
  if (String(next || '').length < 6) return { ok: false, error: 'Use at least 6 characters' }
  return setPassword(next)
}

export function passwordStrength(password) {
  const value = String(password || '')
  if (!value) return { score: 0, label: 'Empty' }
  let score = 0
  if (value.length >= 6) score += 1
  if (value.length >= 10) score += 1
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/\d/.test(value) || /[^\w\s]/.test(value)) score += 1
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']
  return { score, label: labels[score] }
}
