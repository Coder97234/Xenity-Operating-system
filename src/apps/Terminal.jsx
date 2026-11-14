import { useEffect, useRef, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { HOME, baseName, formatBytes, joinPath, parentPath, prettyPath, resolvePath } from '../os/fs'
import { APP_LIST, APPS } from '../os/apps'
import { CODENAME, VERSION } from '../os/updater'

const BANNER = [
  'Xenity 1.4.1 (Nova) — xenity-core shell',
  'Type "help" for the command list, "neofetch" for system info.',
]

const HELP = [
  ['ls [-l] [path]', 'list a directory'],
  ['cd [path]', 'change directory'],
  ['pwd', 'print working directory'],
  ['cat <file…>', 'print file contents'],
  ['echo <text> [> file]', 'print text, or write it to a file'],
  ['touch <file>', 'create an empty file'],
  ['mkdir [-p] <dir>', 'create a directory'],
  ['rm [-r] <path>', 'remove a file or directory'],
  ['mv <from> <to>', 'move or rename'],
  ['cp <from> <to>', 'copy'],
  ['tree [path]', 'show the tree'],
  ['df', 'storage report'],
  ['open <app|path>', 'launch an app or open a path'],
  ['pkg list|install|remove <name>', 'manage applications'],
  ['update', 'run the Xenity system updater'],
  ['neofetch', 'system summary'],
  ['uname -a', 'kernel and version'],
  ['whoami / hostname / date / uptime', 'session info'],
  ['history', 'command history'],
  ['clear', 'clear the screen'],
  ['exit', 'close this terminal'],
]

function tokenize(input) {
  const tokens = []
  let cur = ''
  let quote = null
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (cur) {
        tokens.push(cur)
        cur = ''
      }
      continue
    }
    cur += ch
  }
  if (cur) tokens.push(cur)
  return tokens
}

const pad = (text, width) => String(text).padEnd(width)

export default function Terminal({ win }) {
  const sys = useSystem()
  const [lines, setLines] = useState(() => BANNER.map((text) => ({ kind: 'dim', text })))
  const [cwd, setCwd] = useState(HOME)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const seq = useRef(0)

  const nextId = () => ++seq.current

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const push = (out, text = '', kind = 'out') => out.push({ kind, text })

  const execute = (raw) => {
    const out = []
    const parts = tokenize(raw)
    if (!parts.length) return { out, cwd }

    let redirect = null
    const redirIdx = parts.findIndex((t) => t === '>' || t === '>>')
    if (redirIdx >= 0) {
      redirect = { mode: parts[redirIdx], target: parts[redirIdx + 1] }
      parts.splice(redirIdx)
    }
    if (!parts.length) return { out, cwd }

    const cmd = parts[0]
    const args = parts.slice(1)
    const flags = args.filter((a) => a.startsWith('-')).join('')
    const operands = args.filter((a) => !a.startsWith('-'))
    const cwdOut = { cwd }
    const fs = sys.fs
    const user = sys.settings.user

    const fail = (message) => push(out, message, 'err')

    try {
      switch (cmd) {
        case 'help':
          push(out, 'Xenity shell — built-in commands', 'accent')
          HELP.forEach(([name, desc]) => push(out, `  ${pad(name, 34)}${desc}`))
          break

        case 'clear':
          return { out, cwd, clear: true }

        case 'pwd':
          push(out, cwd)
          break

        case 'ls': {
          const target = resolvePath(cwd, operands[0] || '.')
          const entries = fs.list(target)
          if (flags.includes('l')) {
            push(out, `${pad('mode', 11)}${pad('owner', 9)}${pad('size', 10)}name`, 'dim')
            for (const e of entries) {
              push(out, `${pad(e.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--', 11)}${pad(user, 9)}${pad(formatBytes(e.size), 10)}${e.name}`)
            }
          } else {
            const names = entries.map((e) => (e.type === 'dir' ? `${e.name}/` : e.name))
            if (names.length) push(out, names.join('   '))
          }
          break
        }

        case 'cd': {
          const target = resolvePath(cwd, operands[0] || '~')
          if (!fs.exists(target)) return fail(`cd: no such file or directory: ${prettyPath(target)}`), { out, cwd }
          if (!fs.isDir(target)) return fail(`cd: not a directory: ${prettyPath(target)}`), { out, cwd }
          cwdOut.cwd = target
          break
        }

        case 'cat': {
          if (!operands.length) return fail('cat: missing file operand'), { out, cwd }
          for (const name of operands) {
            const path = resolvePath(cwd, name)
            try {
              push(out, fs.read(path))
            } catch (err) {
              fail(`cat: ${err.message}`)
            }
          }
          break
        }

        case 'echo': {
          const text = operands.join(' ')
          if (redirect?.target) {
            const path = resolvePath(cwd, redirect.target)
            try {
              if (redirect.mode === '>') fs.write(path, text + '\n')
              else fs.write(path, text + '\n', { append: true })
              sys.commit()
              push(out, `wrote ${path}`, 'dim')
            } catch (err) {
              fail(`echo: ${err.message}`)
            }
          } else {
            push(out, text)
          }
          break
        }

        case 'touch': {
          if (!operands.length) return fail('touch: missing file operand'), { out, cwd }
          for (const name of operands) {
            const path = resolvePath(cwd, name)
            try {
              if (!fs.exists(path)) fs.write(path, '')
              sys.commit()
            } catch (err) {
              fail(`touch: ${err.message}`)
            }
          }
          break
        }

        case 'mkdir': {
          if (!operands.length) return fail('mkdir: missing operand'), { out, cwd }
          for (const name of operands) {
            try {
              fs.mkdir(resolvePath(cwd, name), { recursive: flags.includes('p') })
              sys.commit()
            } catch (err) {
              fail(`mkdir: ${err.message}`)
            }
          }
          break
        }

        case 'rm': {
          if (!operands.length) return fail('rm: missing operand'), { out, cwd }
          for (const name of operands) {
            const path = resolvePath(cwd, name)
            if (path === HOME) return fail('rm: refusing to remove your home folder'), { out, cwd }
            try {
              fs.remove(path, { recursive: flags.includes('r') || flags.includes('R') })
              sys.commit()
            } catch (err) {
              fail(`rm: ${err.message}`)
            }
          }
          break
        }

        case 'mv':
        case 'cp': {
          if (operands.length < 2) return fail(`${cmd}: usage: ${cmd} <from> <to>`), { out, cwd }
          const from = resolvePath(cwd, operands[0])
          const to = resolvePath(cwd, operands[1])
          try {
            if (cmd === 'mv') fs.move(from, to)
            else fs.copy(from, to)
            sys.commit()
          } catch (err) {
            fail(`${cmd}: ${err.message}`)
          }
          break
        }

        case 'tree': {
          const root = resolvePath(cwd, operands[0] || '.')
          push(out, prettyPath(root), 'accent')
          const walk = (path, depth) => {
            const entries = fs.list(path)
            entries.forEach((e, i) => {
              const last = i === entries.length - 1
              const branch = '│   '
              push(out, `${'│   '.repeat(Math.max(0, depth - 1))}${last ? '└── ' : '├── '}${e.name}${e.type === 'dir' ? '/' : ''}`)
              if (e.type === 'dir' && depth < 4) walk(joinPath(path, e.name), depth + 1)
            })
          }
          walk(root, 0)
          break
        }

        case 'df': {
          const total = fs.totalSize()
          const system = fs.du(fs.node('/System'))
          const cache = fs.du(fs.node('/var/cache'))
          push(out, `${pad('Filesystem', 16)}${pad('Size', 8)}${pad('Used', 10)}${pad('Avail', 10)}Use%  Mounted on`, 'dim')
          push(out, `${pad('xenity-drive', 16)}${pad('64G', 8)}${pad(formatBytes(total), 10)}${pad('64G', 10)}0%    /`)
          push(out, `${pad('xenity-core', 16)}${pad('2M', 8)}${pad(formatBytes(system), 10)}${pad('—', 10)}—     /System`)
          push(out, `${pad('system-cache', 16)}${pad('32M', 8)}${pad(formatBytes(cache), 10)}${pad('—', 10)}—     /var/cache`, 'dim')
          push(out, `Xenity keeps its own footprint in the kilobytes; the rest is your data.`, 'dim')
          break
        }

        case 'whoami':
          push(out, user)
          break

        case 'hostname':
          push(out, 'xenity')
          break

        case 'date':
          push(out, new Date().toString())
          break

        case 'uptime': {
          const secs = Math.max(1, Math.round((Date.now() - sys.bootedAt) / 1000))
          push(out, `up ${Math.floor(secs / 60)}m ${secs % 60}s, 1 user, load average: 0.04 0.02 0.01`)
          break
        }

        case 'uname':
          push(out, 'Xenity xenity 1.4.1 (Nova) xenity-core #1 SMP web x86_64')
          break

        case 'version':
          push(out, `Xenity ${VERSION} (${CODENAME}) — xenity-core 1.4.1`)
          break

        case 'apps': {
          push(out, `${pad('App', 22)}${pad('Status', 14)}Category`, 'dim')
          APP_LIST.filter((a) => !a.hidden).forEach((a) => {
            const status = sys.isInstalled(a.id) ? 'installed' : 'available'
            push(out, `${pad(a.name, 22)}${pad(status, 14)}${a.tag || 'System'}`)
          })
          break
        }

        case 'pkg': {
          const sub = operands[0] || 'list'
          const name = operands[1]
          if (sub === 'list' || sub === 'search') {
            push(out, 'Name                Status       Category', 'dim')
            APP_LIST.filter((a) => !a.hidden).forEach((a) => {
              const status = sys.isInstalled(a.id) ? 'installed' : a.preinstalled ? 'system' : 'available'
              push(out, `${pad(a.id, 20)}${pad(status, 13)}${a.tag || 'System'}`)
            })
          } else if (sub === 'install') {
            if (!name) return fail('pkg: usage: pkg install <app>'), { out, cwd }
            const meta = APPS[name.toLowerCase()]
            if (!meta) return fail(`pkg: package not found: ${name}`), { out, cwd }
            const result = sys.installPkg(meta.id)
            if (!result.ok) fail(`pkg: ${result.error}`)
            else push(out, `installed ${result.name}`, 'ok')
          } else if (sub === 'remove' || sub === 'uninstall') {
            if (!name) return fail('pkg: usage: pkg remove <app>'), { out, cwd }
            const meta = APPS[name.toLowerCase()]
            if (!meta) return fail(`pkg: package not found: ${name}`), { out, cwd }
            const result = sys.uninstallPkg(meta.id)
            if (!result.ok) fail(`pkg: ${result.error}`)
            else push(out, `removed ${result.name}`, 'ok')
          } else {
            fail('pkg: usage: pkg list | pkg install <app> | pkg remove <app>')
          }
          break
        }

        case 'install':
        case 'uninstall': {
          const name = operands[0]
          if (!name) return fail(`${cmd}: usage: ${cmd} <app>`), { out, cwd }
          const meta = APPS[name.toLowerCase()]
          if (!meta) return fail(`${cmd}: package not found: ${name}`), { out, cwd }
          const result = cmd === 'install' ? sys.installPkg(meta.id) : sys.uninstallPkg(meta.id)
          if (!result.ok) fail(`${cmd}: ${result.error}`)
          else push(out, `${cmd === 'install' ? 'installed' : 'removed'} ${result.name}`, 'ok')
          break
        }

        case 'open': {
          if (!operands.length) return fail('open: usage: open <app|path>'), { out, cwd }
          const target = operands[0]
          const meta = APPS[target.toLowerCase()] || APP_LIST.find((a) => a.name.toLowerCase() === target.toLowerCase())
          const path = resolvePath(cwd, target)
          if (meta) {
            sys.openApp(meta.id)
            push(out, `opened ${meta.name}`, 'dim')
          } else if (fs.exists(path)) {
            if (fs.isDir(path)) sys.openApp('finder', { path })
            else sys.openApp('editor', { path })
            push(out, `opened ${prettyPath(path)}`, 'dim')
          } else {
            fail(`open: no such app or file: ${target}`)
          }
          break
        }

        case 'update': {
          const result = sys.runSystemUpdate()
          push(out, 'xenity-update', 'accent')
          push(out, result.log)
          if (result.removed.length) {
            push(out, 'removed:', 'dim')
            result.removed.forEach((p) => push(out, `  ${p}`, 'dim'))
          } else {
            push(out, 'nothing to remove — the system is already clean.', 'dim')
          }
          push(out, 'your files under /Users were not touched.', 'dim')
          break
        }

        case 'neofetch': {
          const logo = [
            '      ██       ██      ',
            '       ██     ██       ',
            '        ██   ██        ',
            '         ██ ██         ',
            '         ██ ██         ',
            '        ██   ██        ',
            '       ██     ██       ',
            '      ██       ██      ',
          ]
          const secs = Math.max(1, Math.round((Date.now() - sys.bootedAt) / 1000))
          const info = [
            `${user}@xenity`,
            '-----------------',
            `OS: Xenity ${VERSION} (${CODENAME})`,
            'Kernel: xenity-core 1.4.1',
            'Shell: xsh 3.2',
            `Uptime: ${Math.floor(secs / 60)}m ${secs % 60}s`,
            `Packages: ${APP_LIST.filter((a) => !a.hidden && sys.isInstalled(a.id)).length} (pkg)`,
            `Storage: ${formatBytes(sys.fs.totalSize())} used`,
            'Memory: 128 MB / 1024 MB',
          ]
          const rows = Math.max(logo.length, info.length)
          for (let i = 0; i < rows; i += 1) {
            push(out, `${(logo[i] || '').padEnd(24)}${info[i] || ''}`, i === 0 ? 'accent' : 'out')
          }
          break
        }

        case 'history':
          if (!history.length) push(out, 'no commands yet', 'dim')
          history.forEach((h, i) => push(out, `${String(i + 1).padStart(3)}  ${h}`))
          break

        case 'man': {
          const topic = operands[0]
          const entry = HELP.find(([name]) => name.split(' ')[0] === topic)
          if (!entry) fail(`man: no manual entry for ${topic || 'nothing'}`)
          else {
            push(out, entry[0], 'accent')
            push(out, entry[1])
          }
          break
        }

        case 'sudo':
          push(out, `xenity is already the superuser of this machine.`, 'dim')
          break

        case 'exit':
          return { out, cwd, close: true }

        case 'reboot':
        case 'restart':
          sys.restart()
          return { out, cwd }

        case 'shutdown':
        case 'poweroff':
          sys.powerOff()
          return { out, cwd }

        default:
          fail(`${cmd}: command not found — try "help"`)
      }
    } catch (err) {
      fail(`${cmd}: ${err?.message || 'failed'}`)
    }

    if (redirect?.target && cmd !== 'echo') {
      const path = resolvePath(cwd, redirect.target)
      try {
        sys.fs.write(path, out.map((l) => l.text).join('\n') + '\n')
        sys.commit()
        return { out: [{ kind: 'dim', text: `wrote ${redirect.target}` }], cwd: cwdOut.cwd }
      } catch (err) {
        return { out: [...out, { kind: 'err', text: `${cmd}: ${err.message}` }], cwd: cwdOut.cwd }
      }
    }

    return { out, cwd: cwdOut.cwd }
  }

  const submit = (raw) => {
    const line = raw.trim()
    const echoed = { kind: 'cmd', text: `${prompt} ${raw}` }
    if (!line) {
      setLines((l) => [...l, echoed])
      setInput('')
      return
    }
    const result = execute(line)
    if (result.clear) {
      setLines([])
    } else {
      setLines((l) => [...l, echoed, ...result.out.map((entry) => ({ ...entry, id: nextId() }))])
    }
    if (result.cwd) setCwd(result.cwd)
    setHistory((h) => [...h, line])
    setHistoryIndex(-1)
    setInput('')
    if (result.close) window.setTimeout(() => sys.closeWindow(win.id), 0)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit(input)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!history.length) return
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(next)
      setInput(history[next])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex < 0) return
      const next = historyIndex + 1
      if (next >= history.length) {
        setHistoryIndex(-1)
        setInput('')
      } else {
        setHistoryIndex(next)
        setInput(history[next])
      }
      return
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      setLines([])
      return
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      setLines((l) => [...l, { kind: 'cmd', text: `${prompt} ${input}^C` }])
      setInput('')
    }
  }

  const prompt = `${sys.settings.user}@xenity ${prettyPath(cwd)} %`

  return (
    <div className="term" onClick={() => inputRef.current?.focus()}>
      <div className="term-scroll" ref={scrollRef}>
        {lines.map((line, i) => (
          <div key={line.id || `l-${i}`} className={`term-line ${line.kind || 'out'}`}>
            {line.text}
          </div>
        ))}
        <div className="term-input-row">
          <span className="term-prompt">{prompt}</span>
          <input
            ref={inputRef}
            className="term-input"
            value={input}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Terminal input"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    </div>
  )
}
