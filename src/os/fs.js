// Xenity virtual file system.
//
// The tree lives in localStorage under `xenity.user.fs` — that is user data and
// the updater never touches it. System caches live under /var/cache and are the
// only thing a Xenity update is allowed to remove.

export const HOME = '/Users/xenity'
const FS_KEY = 'xenity.user.fs'

const file = (content) => ({ type: 'file', content, modified: Date.now() })
const dir = (children = {}) => ({ type: 'dir', children })

const welcome = `Xenity 1.4.1 (Nova)

Welcome to your machine. This desktop IS the operating system: a window
manager, a real shell, a file system, a browser and a package store.

Try this:
  1. Open Terminal and run: neofetch
  2. Run: ls ~/Documents
  3. Run: pkg list
  4. Open Xenity Store and install Calculator

Everything you create lives in this browser. Xenity itself is measured in
kilobytes, and its updater only removes its own old system caches
(/var/cache/xenity-*) — your files are never touched.
`

const shortcuts = `Xenity keyboard shortcuts

  Cmd/Ctrl + Space   Launchpad
  Cmd/Ctrl + Alt + T Terminal
  Esc                Close Launchpad

Window controls
  Red     close
  Yellow  minimise (window drops into the Dock)
  Green   full screen

Files
  Double click a folder to open it
  Double click a text file to edit it
`

const shellNotes = `# Xenity shell

The Terminal is a working shell for this machine.

  ls, cd, pwd, cat, echo, touch, mkdir, rm, mv, cp, tree, df
  open <app>, pkg list, pkg install <app>, update, neofetch, uname -a
  echo "text" > file.txt     write a file
  echo "text" >> file.txt    append to a file
`

export function createInitialTree() {
  return dir({
    Users: dir({
      xenity: dir({
        Desktop: dir({
          'welcome.txt': file(welcome),
        }),
        Documents: dir({
          'notes.md': file(shellNotes),
          'shortcuts.txt': file(shortcuts),
          'todo.txt': file('[ ] design the next Xenity release\n[ ] write release notes\n'),
        }),
        Downloads: dir({}),
        Pictures: dir({
          'README.txt': file('Drop images here — Xenity Drive keeps them locally.\n'),
        }),
        Music: dir({}),
        'readme.md': file(welcome),
      }),
    }),
    Applications: dir({}),
    System: dir({
      version: file('Xenity 1.4.1 (Nova)\nxenity-core 1.4.1\nweb-native / no virtual machine\n'),
      kernel: file('xenity-core 1.4.1 #1 SMP PREEMPT web x86_64\n'),
    }),
    Library: dir({
      Caches: dir({}),
      Preferences: dir({
        'com.xenity.appearance.plist': file('theme = light\naccent = #0a84ff\nwallpaper = aurora\n'),
      }),
    }),
    var: dir({
      log: dir({
        'system.log': file('[boot] xenity-core 1.4.1 initialised\n[boot] window server ready\n[boot] user session opened for xenity\n'),
      }),
      cache: dir({
        'xenity-1.3.0': dir({
          'wallpaper-cache.bin': file('x'.repeat(4096)),
          'font-cache.bin': file('x'.repeat(2048)),
        }),
        'xenity-1.4.1': dir({
          'boot-cache.bin': file('x'.repeat(512)),
        }),
      }),
    }),
    tmp: dir({}),
  })
}

export function resolvePath(cwd, input = '') {
  let p = String(input || '')
  if (p === '~') p = HOME
  else if (p.startsWith('~/')) p = HOME + p.slice(1)
  const base = p.startsWith('/') ? p : `${cwd}/${p}`
  const out = []
  for (const seg of base.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') {
      out.pop()
      continue
    }
    out.push(seg)
  }
  return '/' + out.join('/')
}

export const parentPath = (p) => {
  const i = p.lastIndexOf('/')
  return i <= 0 ? '/' : p.slice(0, i)
}

export const baseName = (p) => p.slice(p.lastIndexOf('/') + 1)

export const joinPath = (a, b) => (a === '/' ? `/${b}` : `${a}/${b}`)

export const prettyPath = (p) => (p === HOME ? '~' : p.startsWith(HOME + '/') ? '~' + p.slice(HOME.length) : p)

export function formatBytes(n = 0) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const byteLength = (text) => new TextEncoder().encode(String(text ?? '')).length

export class FileSystem {
  constructor(root) {
    this.root = root
  }

  static load() {
    try {
      const raw = localStorage.getItem(FS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.type === 'dir' && parsed.children) return new FileSystem(parsed)
      }
    } catch {
      /* corrupted store — fall back to a fresh tree */
    }
    return new FileSystem(createInitialTree())
  }

  save() {
    try {
      localStorage.setItem(FS_KEY, JSON.stringify(this.root))
    } catch {
      /* storage full — the in-memory tree still works */
    }
  }

  node(path) {
    const p = resolvePath('/', path)
    if (p === '/') return this.root
    let cur = this.root
    for (const seg of p.slice(1).split('/')) {
      if (!cur || cur.type !== 'dir') return null
      cur = cur.children[seg]
      if (!cur) return null
    }
    return cur || null
  }

  exists(path) {
    return this.node(path) !== null
  }

  isDir(path) {
    const n = this.node(path)
    return !!n && n.type === 'dir'
  }

  du(node) {
    if (!node) return 0
    if (node.type === 'file') return byteLength(node.content)
    return Object.values(node.children).reduce((sum, child) => sum + this.du(child), 0)
  }

  list(path) {
    const p = resolvePath('/', path)
    const n = this.node(p)
    if (!n) throw new Error(`No such file or directory: ${prettyPath(p)}`)
    if (n.type === 'file') {
      return [{ name: baseName(p), type: 'file', size: byteLength(n.content), modified: n.modified }]
    }
    return Object.entries(n.children)
      .map(([name, child]) => ({
        name,
        type: child.type,
        size: child.type === 'file' ? byteLength(child.content) : this.du(child),
        modified: child.modified || 0,
      }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
  }

  read(path) {
    const n = this.node(path)
    if (!n) throw new Error(`No such file or directory: ${prettyPath(path)}`)
    if (n.type === 'dir') throw new Error(`Is a directory: ${prettyPath(path)}`)
    return n.content
  }

  write(path, content, { append = false, create = true } = {}) {
    const p = resolvePath('/', path)
    if (p === '/') throw new Error('Is a directory: /')
    const parent = this.node(parentPath(p))
    if (!parent) throw new Error(`No such file or directory: ${prettyPath(parentPath(p))}`)
    if (parent.type !== 'dir') throw new Error(`Not a directory: ${prettyPath(parentPath(p))}`)
    const name = baseName(p)
    const existing = parent.children[name]
    if (existing && existing.type === 'dir') throw new Error(`Is a directory: ${prettyPath(p)}`)
    if (!existing && !create) throw new Error(`No such file: ${prettyPath(p)}`)
    parent.children[name] = file(append && existing ? existing.content + content : content)
    return p
  }

  append(path, line) {
    const stamp = line.endsWith('\n') ? line : `${line}\n`
    if (!this.exists(path)) {
      const parent = parentPath(path)
      if (!this.exists(parent)) this.mkdir(parent, { recursive: true })
      this.write(path, stamp)
      return
    }
    this.write(path, stamp, { append: true })
  }

  mkdir(path, { recursive = false } = {}) {
    const p = resolvePath('/', path)
    if (p === '/') return p
    if (this.exists(p)) {
      if (recursive) return p
      throw new Error(`File exists: ${prettyPath(p)}`)
    }
    const parent = this.node(parentPath(p))
    if (!parent) {
      if (!recursive) throw new Error(`No such file or directory: ${prettyPath(parentPath(p))}`)
      this.mkdir(parentPath(p), { recursive: true })
    } else if (parent.type !== 'dir') {
      throw new Error(`Not a directory: ${prettyPath(parentPath(p))}`)
    }
    this.node(parentPath(p)).children[baseName(p)] = dir({})
    return p
  }

  remove(path, { recursive = false } = {}) {
    const p = resolvePath('/', path)
    if (p === '/') throw new Error('Refusing to remove /')
    const node = this.node(p)
    if (!node) throw new Error(`No such file or directory: ${prettyPath(p)}`)
    if (node.type === 'dir' && Object.keys(node.children).length && !recursive) {
      throw new Error(`Directory not empty: ${prettyPath(p)}`)
    }
    delete this.node(parentPath(p)).children[baseName(p)]
    return p
  }

  move(from, to) {
    const src = resolvePath('/', from)
    const dst = resolvePath('/', to)
    if (src === '/' || dst === '/') throw new Error('Refusing to move /')
    if (!this.exists(src)) throw new Error(`No such file or directory: ${prettyPath(src)}`)
    if (!this.exists(parentPath(dst))) throw new Error(`No such file or directory: ${prettyPath(parentPath(dst))}`)
    const targetPath = this.isDir(dst) ? joinPath(dst, baseName(src)) : dst
    const node = this.node(src)
    delete this.node(parentPath(src)).children[baseName(src)]
    this.node(parentPath(targetPath)).children[baseName(targetPath)] = node
    return targetPath
  }

  copy(from, to) {
    const src = resolvePath('/', from)
    const dst = resolvePath('/', to)
    if (!this.exists(src)) throw new Error(`No such file or directory: ${prettyPath(src)}`)
    if (!this.exists(parentPath(dst))) throw new Error(`No such file or directory: ${prettyPath(parentPath(dst))}`)
    const targetPath = this.isDir(dst) ? joinPath(dst, baseName(src)) : dst
    const clone = structuredClone(this.node(src))
    this.node(parentPath(targetPath)).children[baseName(targetPath)] = clone
    return targetPath
  }

  totalSize() {
    return this.du(this.root)
  }

  walk(path, depth = 0, out = []) {
    const p = resolvePath('/', path)
    for (const entry of this.list(p)) {
      out.push({ ...entry, path: joinPath(p, entry.name), depth })
      if (entry.type === 'dir' && depth < 4) this.walk(joinPath(p, entry.name), depth + 1, out)
    }
    return out
  }
}
