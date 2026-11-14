// App metadata only — no component imports, so the system store can stay free of
// circular dependencies. Rendering components are mapped in registry.jsx.

export const APPS = {
  finder: {
    id: 'finder',
    name: 'Files',
    icon: 'finder',
    defaultSize: { w: 900, h: 560 },
    preinstalled: true,
    description: 'Browse Xenity Drive — every file on the machine.',
  },
  browser: {
    id: 'browser',
    name: 'Xenity Browser',
    icon: 'browser',
    defaultSize: { w: 1000, h: 640 },
    preinstalled: true,
    description: 'A fast tabbed browser with its own start page.',
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    icon: 'terminal',
    defaultSize: { w: 730, h: 460 },
    preinstalled: true,
    description: 'A real shell: files, packages, system info.',
  },
  store: {
    id: 'store',
    name: 'Xenity Store',
    icon: 'store',
    defaultSize: { w: 840, h: 600 },
    preinstalled: true,
    description: 'Install and remove Xenity applications.',
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: 'settings',
    defaultSize: { w: 880, h: 600 },
    preinstalled: true,
    description: 'Appearance, storage, updates and account.',
  },
  notes: {
    id: 'notes',
    name: 'Notes',
    icon: 'notes',
    defaultSize: { w: 760, h: 520 },
    preinstalled: false,
    tag: 'Productivity',
    size: '0.6 MB',
    description: 'Quick notes that stay on this machine.',
  },
  calculator: {
    id: 'calculator',
    name: 'Calculator',
    icon: 'calculator',
    defaultSize: { w: 300, h: 420 },
    minSize: { w: 280, h: 380 },
    preinstalled: false,
    tag: 'Utilities',
    size: '0.4 MB',
    description: 'A basic calculator with a physical keypad.',
  },
  weather: {
    id: 'weather',
    name: 'Weather',
    icon: 'weather',
    defaultSize: { w: 540, h: 560 },
    preinstalled: false,
    tag: 'Utilities',
    size: '0.8 MB',
    description: 'Local forecast for the Xenity demo city.',
  },
  editor: {
    id: 'editor',
    name: 'Text Editor',
    icon: 'editor',
    defaultSize: { w: 720, h: 520 },
    preinstalled: true,
    hidden: true,
    description: 'Edit text files on Xenity Drive.',
  },
}

export const APP_LIST = Object.values(APPS)
export const DOCK_APPS = APP_LIST.filter((app) => !app.hidden)
export const STORE_APPS = APP_LIST.filter((app) => !app.hidden)
