// Xenity networking.
//
// The machine has no radio of its own — Xenity runs in the browser — so the
// nearby networks below are the machine's network model. Passwords are checked
// and kept in the Passwords vault, and a saved network reconnects on boot.

export const WIFI_NETWORKS = [
  { ssid: 'Xenity-5G', security: 'wpa2', signal: 4, band: '5 GHz', channel: 44 },
  { ssid: 'Nova-Home', security: 'wpa2', signal: 4, band: '5 GHz', channel: 36 },
  { ssid: 'Xenity-Guest', security: 'open', signal: 3, band: '2.4 GHz', channel: 6 },
  { ssid: 'Cafe Free Wi-Fi', security: 'open', signal: 2, band: '2.4 GHz', channel: 1 },
  { ssid: 'Neighbour-2.4', security: 'wpa2', signal: 1, band: '2.4 GHz', channel: 11 },
]

const SIGNAL_BARS = ['none', 'weak', 'fair', 'good', 'excellent']

export const signalLabel = (signal = 0) => SIGNAL_BARS[Math.min(4, Math.max(0, signal))]

export const networkByName = (ssid) => WIFI_NETWORKS.find((n) => n.ssid === ssid) || null

export function scanNetwork() {
  return [...WIFI_NETWORKS].sort((a, b) => b.signal - a.signal)
}

export function isSecure(network) {
  return !!network && network.security !== 'open'
}

export const localIp = (seed = 0) => `192.168.${1 + (seed % 4)}.${20 + (seed % 200)}`
