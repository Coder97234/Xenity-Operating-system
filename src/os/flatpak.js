// Flathub catalogue.
//
// Xenity Store installs from Flathub: the app is registered as a real Flatpak
// (its ref, runtime and desktop entry land on Xenity Drive) and appears in the
// Dock and Launchpad. A browser can't execute Linux binaries, so launching one
// opens its Xenity app card with the sandbox, runtime and permissions.

export const FLATHUB = [
  {
    id: 'org.mozilla.firefox',
    name: 'Firefox',
    publisher: 'Mozilla',
    category: 'Internet',
    summary: 'Private, fast web browser with tracking protection.',
    version: '133.0',
    size: '94 MB',
    runtime: 'org.freedesktop.Platform 24.08',
    color: '#ff7139',
    letter: 'F',
  },
  {
    id: 'com.google.Chrome',
    name: 'Chrome',
    publisher: 'Google',
    category: 'Internet',
    summary: 'The Chrome browser packaged for Linux desktops.',
    version: '131.0',
    size: '112 MB',
    runtime: 'org.freedesktop.Platform 24.08',
    color: '#4285f4',
    letter: 'C',
  },
  {
    id: 'com.spotify.Client',
    name: 'Spotify',
    publisher: 'Spotify AB',
    category: 'Audio & Video',
    summary: 'Music and podcasts, streamed to your desktop.',
    version: '1.2.47',
    size: '86 MB',
    runtime: 'org.freedesktop.Platform 23.08',
    color: '#1db954',
    letter: 'S',
  },
  {
    id: 'org.videolan.VLC',
    name: 'VLC',
    publisher: 'VideoLAN',
    category: 'Audio & Video',
    summary: 'Plays every media file and disc you own.',
    version: '3.0.21',
    size: '72 MB',
    runtime: 'org.kde.Platform 6.7',
    color: '#ff8a00',
    letter: 'V',
  },
  {
    id: 'org.gimp.GIMP',
    name: 'GIMP',
    publisher: 'The GIMP Team',
    category: 'Graphics',
    summary: 'Image editor for photo retouching and composition.',
    version: '2.10.38',
    size: '148 MB',
    runtime: 'org.gnome.Platform 46',
    color: '#7c5c3b',
    letter: 'G',
  },
  {
    id: 'org.blender.Blender',
    name: 'Blender',
    publisher: 'Blender Foundation',
    category: 'Graphics',
    summary: '3D modelling, animation, rendering and video editing.',
    version: '4.3.0',
    size: '320 MB',
    runtime: 'org.freedesktop.Platform 24.08',
    color: '#ea7600',
    letter: 'B',
  },
  {
    id: 'com.obsproject.Studio',
    name: 'OBS Studio',
    publisher: 'OBS Project',
    category: 'Audio & Video',
    summary: 'Record and stream your screen with scenes and sources.',
    version: '31.0',
    size: '156 MB',
    runtime: 'org.kde.Platform 6.7',
    color: '#302e31',
    letter: 'O',
  },
  {
    id: 'org.libreoffice.LibreOffice',
    name: 'LibreOffice',
    publisher: 'The Document Foundation',
    category: 'Office',
    summary: 'Documents, spreadsheets and presentations.',
    version: '24.8.3',
    size: '412 MB',
    runtime: 'org.freedesktop.Platform 24.08',
    color: '#18a303',
    letter: 'L',
  },
  {
    id: 'md.obsidian.Obsidian',
    name: 'Obsidian',
    publisher: 'Obsidian MD',
    category: 'Office',
    summary: 'Markdown notes linked into a private knowledge base.',
    version: '1.7.7',
    size: '98 MB',
    runtime: 'org.freedesktop.Platform 24.08',
    color: '#6c4bd8',
    letter: 'O',
  },
  {
    id: 'com.discordapp.Discord',
    name: 'Discord',
    publisher: 'Discord Inc.',
    category: 'Internet',
    summary: 'Voice, video and text chat for your communities.',
    version: '0.0.76',
    size: '104 MB',
    runtime: 'org.freedesktop.Platform 23.08',
    color: '#5865f2',
    letter: 'D',
  },
  {
    id: 'org.telegram.desktop',
    name: 'Telegram',
    publisher: 'Telegram FZ-LLC',
    category: 'Internet',
    summary: 'Fast messaging on every device you own.',
    version: '5.8.3',
    size: '72 MB',
    runtime: 'org.freedesktop.Platform 24.08',
    color: '#229ed9',
    letter: 'T',
  },
  {
    id: 'com.visualstudio.code',
    name: 'Visual Studio Code',
    publisher: 'Microsoft',
    category: 'Developer',
    summary: 'Code editor with debugging, Git and extensions.',
    version: '1.95.2',
    size: '186 MB',
    runtime: 'org.freedesktop.Platform 24.08',
    color: '#007acc',
    letter: 'V',
  },
  {
    id: 'org.kde.krita',
    name: 'Krita',
    publisher: 'KDE',
    category: 'Graphics',
    summary: 'Digital painting studio for illustrators.',
    version: '5.2.6',
    size: '224 MB',
    runtime: 'org.kde.Platform 6.7',
    color: '#e067c4',
    letter: 'K',
  },
  {
    id: 'com.valvesoftware.Steam',
    name: 'Steam',
    publisher: 'Valve',
    category: 'Games',
    summary: 'Game library, store and Proton compatibility.',
    version: '1.0.0.81',
    size: '268 MB',
    runtime: 'org.freedesktop.Platform 24.08',
    color: '#1b2838',
    letter: 'S',
  },
  {
    id: 'net.lutris.Lutris',
    name: 'Lutris',
    publisher: 'Lutris Team',
    category: 'Games',
    summary: 'Game manager for Steam, Wine and emulators.',
    version: '0.5.18',
    size: '126 MB',
    runtime: 'org.gnome.Platform 46',
    color: '#ffb300',
    letter: 'L',
  },
  {
    id: 'org.audacityteam.Audacity',
    name: 'Audacity',
    publisher: 'Audacity Team',
    category: 'Audio & Video',
    summary: 'Multi-track audio recording and editing.',
    version: '3.7.0',
    size: '64 MB',
    runtime: 'org.freedesktop.Platform 24.08',
    color: '#1b57a5',
    letter: 'A',
  },
]

export const FLATPAK_BY_ID = Object.fromEntries(FLATHUB.map((app) => [app.id, app]))

export const findFlatpak = (query = '') => {
  const q = query.trim().toLowerCase()
  if (!q) return FLATHUB
  return FLATHUB.filter(
    (app) =>
      app.name.toLowerCase().includes(q) ||
      app.id.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q) ||
      app.summary.toLowerCase().includes(q) ||
      app.publisher.toLowerCase().includes(q)
  )
}

export const flatpakRef = (app) => `app/${app.id}/x86_64/stable`

/** The desktop-entry text written to /Applications when a Flatpak installs. */
export function desktopEntry(app) {
  return `[Desktop Entry]
Type=Application
Name=${app.name}
Comment=${app.summary}
Exec=flatpak run ${app.id}
Icon=${app.id}
Categories=${app.category.replace(' & ', ';')};
X-Flatpak=${app.id}
X-Flatpak-Runtime=${app.runtime}
X-Flatpak-Version=${app.version}
`
}
