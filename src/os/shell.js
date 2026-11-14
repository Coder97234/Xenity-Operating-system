// Xenity shell.
//
// One command engine for the Terminal. Every command works against the real
// Xenity file system, packages, Flatpaks, network and session.

import { HOME, baseName, formatBytes, joinPath, parentPath, prettyPath, resolvePath } from './fs'
import { APPS, APP_LIST } from './apps'
import { flatpakKey, isFlatpakId } from './appindex'
import { FLATHUB, findFlatpak, flatpakRef } from './flatpak'
import { scanNetwork, signalLabel } from './network'
import { CODENAME, VERSION } from './updater'

export const HELP = [
  ['ls [-l] [-a] [path]', 'list a directory'],
  ['cd [path]', 'change directory'],
  ['pwd', 'print working directory'],
  ['cat <file…>', 'print file contents'],
  ['head / tail [-n N] <file>', 'first or last lines'],
  ['wc [-l] [-w] <file>', 'count lines, words and bytes'],
  ['grep [-i] [-n] <pattern> <file…>', 'search inside files'],
  ['find [path] [-name pattern]', 'find files by name'],
  ['sort / uniq <file>', 'sort or deduplicate lines'],
  ['echo <text> [> file]', 'print text, or write it to a file'],
  ['touch / mkdir [-p] / rmdir', 'create files and folders'],
  ['rm [-r] / mv / cp [-r] / ln', 'remove, move, copy, link'],
  ['chmod / stat / du / df', 'permissions, metadata, disk usage'],
  ['tree [path]', 'show the file tree'],
  ['open <app|file|path>', 'launch an app or open a path'],
  ['apps', 'list installed applications'],
  ['pkg list|search|install|remove <app>', 'Xenity packages'],
  ['flatpak list|search|install|remove|run|info', 'Flathub applications'],
  ['wifi [list|status|connect <ssid> <pass>|off|forget <ssid>]', 'Wi-Fi'],
  ['ip / ping / curl', 'network status and diagnostics'],
  ['ps / top / free / kill <pid>', 'processes and memory'],
  ['date / cal / uptime / uname / whoami / id', 'session info'],
  ['env / export / unset / printenv', 'environment variables'],
  ['history / man <cmd> / which <cmd> / clear', 'shell help'],
  ['passwd / lock / screensaver', 'account and session'],
  ['update / neofetch / version', 'system'],
  ['nuke', 'reset this machine to a clean Xenity'],
  ['reboot / shutdown / exit', 'power'],
]

const pad = (text, width) => String(text).padEnd(width)

const nowStamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19)

function expand(text, env) {
  return String(text).replace(/\$\{(\w+)\}|\$(\w+)/g, (_, a, b) => env[a || b] ?? '')
}

export function shellEnv(sys, cwd) {
  return {
    USER: sys.settings.user,
    HOME,
    PWD: cwd,
    SHELL: '/bin/xsh',
    HOSTNAME: 'xenity',
    TERM: 'xenity-256color',
    PATH: '/usr/local/bin:/usr/bin:/bin',
    XENITY_VERSION: VERSION,
    ...(sys.settings.env || {}),
  }
}

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

const lines = (text) => String(text ?? '').replace(/\n$/, '').split('\n')

/**
 * Runs one shell line.
 * @returns {{out: {kind: string, text: string}[], cwd: string, action?: string}}
 */
export function runCommand(raw, { cwd, sys, history = [] }) {
  const out = []
  const push = (text = '', kind = 'out') => out.push({ kind, text: String(text) })
  const fail = (text) => push(text, 'err')
  const env = shellEnv(sys, cwd)

  const parts = tokenize(expand(raw.trim(), env))
  if (!parts.length) return { out, cwd }

  // redirection
  let redirect = null
  const redirIdx = parts.findIndex((t) => t === '>' || t === '>>')
  if (redirIdx >= 0) {
    redirect = { mode: parts[redirIdx], target: parts[redirIdx + 1] }
    parts.splice(redirIdx)
  }

  let cmd = parts[0]
  let args = parts.slice(1)
  if (cmd === 'sudo') {
    if (!args.length) {
      push('xenity is already the superuser of this machine.', 'dim')
      return { out, cwd }
    }
    cmd = args[0]
    args = args.slice(1)
    push(`[sudo] password for ${sys.settings.user}: ••••••••`, 'dim')
  }

  const flags = args.filter((a) => a.startsWith('-')).join(' ').replace(/-/g, '')
  const operands = args.filter((a) => !a.startsWith('-'))
  const fs = sys.fs
  const user = sys.settings.user
  let nextCwd = cwd
  let action
  const optionValue = (flag) => {
    const i = args.indexOf(flag)
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : null
  }
  const countOptionIndex = args.indexOf('-n')

  const readAll = (name) => fs.read(resolvePath(cwd, name))

  try {
    switch (cmd) {
      case 'help':
        push('Xenity shell — built-in commands', 'accent')
        HELP.forEach(([name, desc]) => push(`  ${pad(name, 44)}${desc}`))
        push('')
        push(`  ${HELP.length} commands · xsh 3.2 · run "man <cmd>" for one entry`, 'dim')
        break

      case 'clear':
        return { out, cwd, action: 'clear' }

      case 'pwd':
        push(cwd)
        break

      case 'whoami':
        push(user)
        break

      case 'id':
        push(`uid=1000(${user}) gid=1000(${user}) groups=1000(${user}),27(sudo),44(video)`)
        break

      case 'groups':
        push(`${user} sudo video audio network`)
        break

      case 'hostname':
        push('xenity')
        break

      case 'uname':
        push(
          flags.includes('a')
            ? `Xenity xenity 1.4.1 (${CODENAME}) xenity-core #1 SMP web x86_64 GNU/Linux`
            : 'Xenity'
        )
        break

      case 'arch':
        push('x86_64')
        break

      case 'version':
        push(`Xenity ${VERSION} (${CODENAME}) — xenity-core 1.4.1`)
        break

      case 'date':
        push(new Date().toString())
        break

      case 'cal': {
        const d = new Date()
        const year = d.getFullYear()
        const month = d.getMonth()
        push(`${d.toLocaleString(undefined, { month: 'long' })} ${year}`.padStart(20), 'accent')
        push('Su Mo Tu We Th Fr Sa', 'dim')
        const first = new Date(year, month, 1).getDay()
        const days = new Date(year, month + 1, 0).getDate()
        let week = '   '.repeat(first)
        for (let day = 1; day <= days; day += 1) {
          week += String(day).padStart(2) + ' '
          if ((first + day) % 7 === 0) {
            push(week.trimEnd())
            week = ''
          }
        }
        if (week.trim()) push(week.trimEnd())
        break
      }

      case 'uptime': {
        const secs = Math.max(1, Math.round((Date.now() - sys.bootedAt) / 1000))
        push(` ${new Date().toTimeString().slice(0, 8)} up ${Math.floor(secs / 60)}m ${secs % 60}s,  1 user,  load average: 0.04, 0.02, 0.01`)
        break
      }

      case 'ls': {
        const target = resolvePath(cwd, operands[0] || '.')
        const entries = fs.list(target).filter((e) => (flags.includes('a') ? true : !e.name.startsWith('.')))
        if (!entries.length) break
        if (flags.includes('l')) {
          push(`${pad('mode', 11)}${pad('owner', 9)}${pad('size', 10)}modified          name`, 'dim')
          for (const e of entries) {
            const stamp = e.modified ? new Date(e.modified).toISOString().slice(0, 16).replace('T', ' ') : '—'
            push(
              `${pad(e.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--', 11)}${pad(user, 9)}${pad(formatBytes(e.size), 10)}${pad(stamp, 18)}${e.name}${e.type === 'dir' ? '/' : ''}`
            )
          }
        } else {
          push(entries.map((e) => (e.type === 'dir' ? `${e.name}/` : e.name)).join('   '))
        }
        break
      }

      case 'cd': {
        const target = resolvePath(cwd, operands[0] || '~')
        if (!fs.exists(target)) {
          fail(`cd: no such file or directory: ${prettyPath(target)}`)
          break
        }
        if (!fs.isDir(target)) {
          fail(`cd: not a directory: ${prettyPath(target)}`)
          break
        }
        nextCwd = target
        break
      }

      case 'cat':
        if (!operands.length) fail('cat: missing file operand')
        for (const name of operands) {
          try {
            push(fs.read(resolvePath(cwd, name)))
          } catch (err) {
            fail(`cat: ${err.message}`)
          }
        }
        break

      case 'head':
      case 'tail': {
        const count = Math.max(1, parseInt(optionValue('-n') || '10', 10) || 10)
        const skip = countOptionIndex >= 0 ? countOptionIndex + 1 : -1
        const name = args.filter((a, i) => !a.startsWith('-') && i !== skip)[0]
        if (!name) {
          fail(`${cmd}: missing file operand`)
          break
        }
        try {
          const all = lines(fs.read(resolvePath(cwd, name)))
          push((cmd === 'head' ? all.slice(0, count) : all.slice(-count)).join('\n'))
        } catch (err) {
          fail(`${cmd}: ${err.message}`)
        }
        break
      }

      case 'wc': {
        const name = operands[0]
        if (!name) {
          fail('wc: missing file operand')
          break
        }
        try {
          const text = fs.read(resolvePath(cwd, name))
          const countLines = lines(text).length
          const words = text.trim() ? text.trim().split(/\s+/).length : 0
          const bytes = new TextEncoder().encode(text).length
          push(`${String(countLines).padStart(5)} ${String(words).padStart(6)} ${String(bytes).padStart(7)} ${name}`)
        } catch (err) {
          fail(`wc: ${err.message}`)
        }
        break
      }

      case 'grep': {
        const allArgs = args.filter((a) => !a.startsWith('-'))
        if (allArgs.length < 2) {
          fail('grep: usage: grep [-i] [-n] <pattern> <file…>')
          break
        }
        const pattern = allArgs[0]
        let re
        try {
          re = new RegExp(pattern, flags.includes('i') ? 'i' : '')
        } catch {
          fail(`grep: invalid pattern: ${pattern}`)
          break
        }
        let matched = 0
        for (const name of allArgs.slice(1)) {
          let text
          try {
            text = fs.read(resolvePath(cwd, name))
          } catch (err) {
            fail(`grep: ${err.message}`)
            continue
          }
          lines(text).forEach((line, i) => {
            if (!re.test(line)) return
            matched += 1
            push(`${allArgs.length > 2 ? `${name}:` : ''}${flags.includes('n') ? `${i + 1}:` : ''}${line}`)
          })
        }
        if (!matched) push('', 'dim')
        break
      }

      case 'find': {
        const root = resolvePath(cwd, operands[0] || '.')
        const nameIdx = args.indexOf('-name')
        const namePattern = nameIdx >= 0 ? args[nameIdx + 1] : null
        if (!fs.exists(root)) {
          fail(`find: ${prettyPath(root)}: no such file or directory`)
          break
        }
        const matcher = namePattern
          ? new RegExp(`^${namePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i')
          : null
        const hits = [prettyPath(root), ...fs.walk(root).map((e) => prettyPath(e.path))]
        const shown = matcher ? hits.filter((p) => matcher.test(baseName(p))) : hits
        if (!shown.length) push('find: nothing matched', 'dim')
        shown.forEach((p) => push(p))
        break
      }

      case 'sort':
      case 'uniq': {
        const name = operands[0]
        if (!name) {
          fail(`${cmd}: missing file operand`)
          break
        }
        try {
          let list = lines(fs.read(resolvePath(cwd, name)))
          if (cmd === 'sort') list = list.slice().sort((a, b) => a.localeCompare(b))
          else list = list.filter((line, i) => line !== list[i - 1])
          push(list.join('\n'))
        } catch (err) {
          fail(`${cmd}: ${err.message}`)
        }
        break
      }

      case 'tree': {
        const root = resolvePath(cwd, operands[0] || '.')
        if (!fs.exists(root)) {
          fail(`tree: ${prettyPath(root)}: no such file or directory`)
          break
        }
        push(prettyPath(root), 'accent')
        let dirs = 0
        let files = 0
        const walk = (path, depth) => {
          const entries = fs.list(path)
          entries.forEach((e, i) => {
            const last = i === entries.length - 1
            push(`${'│   '.repeat(Math.max(0, depth - 1))}${last ? '└── ' : '├── '}${e.name}${e.type === 'dir' ? '/' : ''}`)
            if (e.type === 'dir') {
              dirs += 1
              if (depth < 4) walk(joinPath(path, e.name), depth + 1)
            } else files += 1
          })
        }
        walk(root, 0)
        push('')
        push(`${dirs} directories, ${files} files`, 'dim')
        break
      }

      case 'du': {
        const root = resolvePath(cwd, operands[0] || '.')
        if (!fs.exists(root)) {
          fail(`du: ${prettyPath(root)}: no such file or directory`)
          break
        }
        push(`${pad(formatBytes(fs.du(fs.node(root))), 10)}${prettyPath(root)}`)
        for (const entry of fs.list(root)) {
          if (entry.type !== 'dir') continue
          push(`${pad(formatBytes(entry.size), 10)}${prettyPath(joinPath(root, entry.name))}`)
        }
        break
      }

      case 'stat': {
        const name = operands[0]
        if (!name) {
          fail('stat: missing operand')
          break
        }
        const path = resolvePath(cwd, name)
        const node = fs.node(path)
        if (!node) {
          fail(`stat: cannot stat '${name}': No such file or directory`)
          break
        }
        push(`  File: ${prettyPath(path)}`)
        push(`  Type: ${node.type === 'dir' ? 'directory' : 'regular file'}`)
        push(`  Size: ${formatBytes(fs.du(node))} (${fs.du(node)} bytes)`)
        push(`  Mode: ${node.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'}  Owner: ${user}:${user}`)
        push(`Modify: ${node.modified ? new Date(node.modified).toString() : '—'}`)
        break
      }

      case 'df': {
        const total = fs.totalSize()
        const system = fs.du(fs.node('/System'))
        const cache = fs.du(fs.node('/var/cache'))
        push(`${pad('Filesystem', 16)}${pad('Size', 8)}${pad('Used', 10)}${pad('Avail', 10)}Use%  Mounted on`, 'dim')
        push(`${pad('xenity-drive', 16)}${pad('64G', 8)}${pad(formatBytes(total), 10)}${pad('64G', 10)}0%    /`)
        push(`${pad('xenity-core', 16)}${pad('2M', 8)}${pad(formatBytes(system), 10)}${pad('—', 10)}—     /System`)
        push(`${pad('system-cache', 16)}${pad('32M', 8)}${pad(formatBytes(cache), 10)}${pad('—', 10)}—     /var/cache`, 'dim')
        push(`${pad('vault', 16)}${pad('—', 8)}${pad(`${sys.vault.length} entries`, 10)}${pad('—', 10)}—     /System/Vault`, 'dim')
        push('Xenity keeps its own footprint in the kilobytes; the rest is your data.', 'dim')
        break
      }

      case 'free': {
        push(`${pad('', 14)}${pad('total', 9)}${pad('used', 9)}${pad('free', 9)}${pad('shared', 9)}${pad('buff/cache', 11)}available`, 'dim')
        push(`${pad('Mem:', 14)}${pad('1024M', 9)}${pad('318M', 9)}${pad('512M', 9)}${pad('46M', 9)}${pad('194M', 11)}706M`)
        push(`${pad('Swap:', 14)}${pad('1024M', 9)}${pad('0B', 9)}${pad('1024M', 9)}`, 'dim')
        break
      }

      case 'ps':
      case 'top': {
        push(`${pad('PID', 7)}${pad('USER', 9)}${pad('CPU%', 7)}${pad('MEM%', 7)}COMMAND`, 'dim')
        const procs = [
          ['1', 'root', '0.0', '0.9', '/sbin/xenity-init'],
          ['42', 'root', '0.4', '1.6', 'xenity-core'],
          ['77', user, '0.8', '2.4', 'xenith-comp'],
          ['131', user, '0.1', '0.7', 'xsh'],
          [`${200 + sys.windows.length}`, user, '2.1', '4.2', 'xenity-window-server'],
        ]
        if (sys.network.ssid) procs.push(['301', 'root', '0.0', '0.3', 'networkd'])
        sys.flatpaks.forEach((id, i) => procs.push([String(410 + i), user, '0.0', '0.2', `flatpak run ${id}`]))
        procs.forEach(([pid, owner, cpu, mem, command]) => push(`${pad(pid, 7)}${pad(owner, 9)}${pad(cpu, 7)}${pad(mem, 7)}${command}`))
        push('')
        push(`${procs.length} processes · uptime ${Math.round((Date.now() - sys.bootedAt) / 60000)}m`, 'dim')
        break
      }

      case 'kill': {
        const pid = operands[0]
        if (!pid) {
          fail('kill: usage: kill <pid>')
          break
        }
        if (['1', '42'].includes(pid)) {
          fail(`kill: (${pid}) - Operation not permitted`)
          break
        }
        push(`[${pid}] terminated`, 'dim')
        break
      }

      case 'chmod':
        push(`chmod: ${operands.join(' ')} — Xenity Drive permissions are fixed in this build.`, 'dim')
        break

      case 'echo':
        if (redirect?.target) {
          const path = resolvePath(cwd, redirect.target)
          const text = operands.join(' ')
          try {
            if (redirect.mode === '>') fs.write(path, `${text}\n`)
            else fs.write(path, `${text}\n`, { append: true })
            sys.commit()
            push(`wrote ${prettyPath(path)}`, 'dim')
          } catch (err) {
            fail(`echo: ${err.message}`)
          }
        } else {
          push(operands.join(' '))
        }
        break

      case 'touch': {
        if (!operands.length) fail('touch: missing file operand')
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
        if (!operands.length) fail('mkdir: missing operand')
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

      case 'rmdir': {
        for (const name of operands) {
          const path = resolvePath(cwd, name)
          try {
            if (!fs.isDir(path)) throw new Error(`not a directory: ${prettyPath(path)}`)
            if (fs.list(path).length) throw new Error(`directory not empty: ${prettyPath(path)}`)
            fs.remove(path)
            sys.commit()
          } catch (err) {
            fail(`rmdir: ${err.message}`)
          }
        }
        break
      }

      case 'rm': {
        if (!operands.length) fail('rm: missing operand')
        for (const name of operands) {
          const path = resolvePath(cwd, name)
          if (path === '/' || path === HOME || path === '/System') {
            fail(`rm: refusing to remove ${prettyPath(path)}`)
            continue
          }
          try {
            fs.remove(path, { recursive: flags.includes('r') || flags.includes('R') || flags.includes('f') })
            sys.commit()
          } catch (err) {
            fail(`rm: ${err.message}`)
          }
        }
        break
      }

      case 'mv':
      case 'cp': {
        if (operands.length < 2) {
          fail(`${cmd}: usage: ${cmd} <from> <to>`)
          break
        }
        try {
          if (cmd === 'mv') fs.move(resolvePath(cwd, operands[0]), resolvePath(cwd, operands[1]))
          else fs.copy(resolvePath(cwd, operands[0]), resolvePath(cwd, operands[1]))
          sys.commit()
        } catch (err) {
          fail(`${cmd}: ${err.message}`)
        }
        break
      }

      case 'ln': {
        if (operands.length < 2) {
          fail('ln: usage: ln -s <from> <to>')
          break
        }
        try {
          fs.copy(resolvePath(cwd, operands[0]), resolvePath(cwd, operands[1]))
          sys.commit()
          push(`linked ${operands[0]} -> ${operands[1]} (copy on Xenity Drive)`, 'dim')
        } catch (err) {
          fail(`ln: ${err.message}`)
        }
        break
      }

      case 'env':
      case 'printenv':
        Object.entries(env).forEach(([key, value]) => push(`${key}=${value}`))
        break

      case 'export': {
        const assignments = operands.filter((a) => a.includes('='))
        if (!assignments.length) {
          Object.entries(env).forEach(([key, value]) => push(`${key}=${value}`))
          break
        }
        const patch = {}
        assignments.forEach((pair) => {
          const [key, ...rest] = pair.split('=')
          patch[key] = rest.join('=')
        })
        sys.updateSettings({ env: { ...(sys.settings.env || {}), ...patch } })
        Object.entries(patch).forEach(([key, value]) => push(`exported ${key}=${value}`, 'dim'))
        break
      }

      case 'unset': {
        if (!operands.length) {
          fail('unset: usage: unset <VAR>')
          break
        }
        const next = { ...(sys.settings.env || {}) }
        operands.forEach((key) => delete next[key])
        sys.updateSettings({ env: next })
        break
      }

      case 'which': {
        const target = operands[0]
        if (!target) {
          fail('which: usage: which <command>')
          break
        }
        if (HELP.some(([usage]) => usage.split(' ')[0] === target)) {
          push(`/usr/bin/${target}`)
        } else if (APPS[target] || APP_LIST.some((a) => a.name.toLowerCase() === target.toLowerCase())) {
          push(`/Applications/${target}`)
        } else {
          fail(`${target}: not found`)
        }
        break
      }

      case 'man': {
        const topic = operands[0]
        const entry = HELP.find(([usage]) => usage.split(' ')[0] === topic)
        if (!entry) fail(`man: no manual entry for ${topic || 'nothing'}`)
        else {
          push(entry[0], 'accent')
          push(entry[1])
          push('', 'dim')
          push('Xenity shell 3.2 · xsh(1)', 'dim')
        }
        break
      }

      case 'history':
        if (!history.length) push('no commands yet', 'dim')
        history.forEach((line, i) => push(`${String(i + 1).padStart(3)}  ${line}`))
        break

      case 'apps': {
        push(`${pad('App', 24)}${pad('Version', 12)}${pad('Status', 14)}Category`, 'dim')
        sys.appList
          .filter((a) => !a.hidden)
          .forEach((a) => {
            const status = sys.isInstalled(a.id) ? 'installed' : 'available'
            const version = a.isFlatpak ? 'flatpak' : '1.4.1'
            push(`${pad(a.name, 24)}${pad(version, 12)}${pad(status, 14)}${a.tag || 'System'}`)
          })
        break
      }

      case 'open': {
        if (!operands.length) {
          fail('open: usage: open <app|file|path>')
          break
        }
        const target = operands[0]
        const meta = sys.appMeta(target) || sys.appList.find((a) => a.name.toLowerCase() === target.toLowerCase())
        const path = resolvePath(cwd, target)
        if (meta) {
          sys.openApp(meta.id)
          push(`opened ${meta.name}`, 'dim')
        } else if (fs.exists(path)) {
          if (fs.isDir(path)) sys.openApp('finder', { path })
          else sys.openApp('editor', { path })
          push(`opened ${prettyPath(path)}`, 'dim')
        } else {
          fail(`open: no such app or file: ${target}`)
        }
        break
      }

      case 'pkg':
      case 'apt': {
        const sub = operands[0] || 'list'
        const name = (operands[1] || '').toLowerCase()
        const native = APP_LIST.filter((a) => !a.hidden)
        if (sub === 'list' || sub === 'search') {
          push('Name                Status       Category', 'dim')
          native.forEach((a) => {
            const status = sys.isInstalled(a.id) ? 'installed' : a.preinstalled ? 'system' : 'available'
            push(`${pad(a.id, 20)}${pad(status, 13)}${a.tag || 'System'}`)
          })
          if (sub === 'search' && name) {
            push('')
            sys.flatpaks.forEach((id) => push(`${pad(id, 30)}installed (flatpak)`))
          }
        } else if (sub === 'install' || sub === 'add') {
          if (!name) {
            fail('pkg: usage: pkg install <app>')
            break
          }
          const meta = APPS[name]
          if (!meta) {
            fail(`pkg: package not found: ${name} — try "flatpak search ${operands[1] || ''}"`)
            break
          }
          const result = sys.installPkg(meta.id)
          if (!result.ok) fail(`pkg: ${result.error}`)
          else push(`installed ${result.name}`, 'ok')
        } else if (sub === 'remove' || sub === 'uninstall' || sub === 'rm') {
          if (!name) {
            fail('pkg: usage: pkg remove <app>')
            break
          }
          const meta = APPS[name]
          if (!meta) {
            fail(`pkg: package not found: ${name}`)
            break
          }
          const result = sys.uninstallPkg(meta.id)
          if (!result.ok) fail(`pkg: ${result.error}`)
          else push(`removed ${result.name}`, 'ok')
        } else if (sub === 'update' || sub === 'upgrade') {
          const result = sys.runSystemUpdate()
          push(result.log)
        } else {
          fail('pkg: usage: pkg list | pkg install <app> | pkg remove <app> | pkg update')
        }
        break
      }

      case 'flatpak': {
        const sub = operands[0] || 'list'
        if (sub === 'list' || sub === 'installed') {
          if (!sys.flatpaks.length) {
            push('no Flatpaks installed — try "flatpak search chrome"', 'dim')
            break
          }
          push(`${pad('Ref', 42)}${pad('Version', 12)}Application`, 'dim')
          sys.flatpaks.forEach((id) => {
            const app = FLATHUB.find((a) => a.id === id)
            push(`${pad(flatpakRef(app), 42)}${pad(app.version, 12)}${app.name}`)
          })
        } else if (sub === 'remote-list' || sub === 'remotes') {
          push(`${pad('Name', 10)}${pad('Options', 12)}URL`, 'dim')
          push(`${pad('flathub', 10)}${pad('system', 12)}https://dl.flathub.org/repo/`)
        } else if (sub === 'search') {
          const q = operands.slice(1).join(' ')
          const results = findFlatpak(q)
          if (!results.length) {
            fail(`flatpak: nothing found for "${q}"`)
            break
          }
          push(`${pad('Ref', 38)}${pad('Version', 12)}Summary`, 'dim')
          results.forEach((app) => push(`${pad(app.id, 38)}${pad(app.version, 12)}${app.summary}`))
        } else if (sub === 'install' || sub === 'add') {
          const target = operands[1]
          if (!target) {
            fail('flatpak: usage: flatpak install <ref|name>')
            break
          }
          const app =
            FLATHUB.find((a) => a.id === target) ||
            FLATHUB.find((a) => a.name.toLowerCase() === target.toLowerCase()) ||
            findFlatpak(target)[0]
          if (!app) {
            fail(`flatpak: no such application ${target}`)
            break
          }
          const result = sys.installFlatpak(app.id)
          if (!result.ok) {
            fail(`flatpak: ${result.error}`)
            break
          }
          push(`Looking for matches…`, 'dim')
          push(`Remote found: flathub (https://dl.flathub.org/repo/)`, 'dim')
          push(`Installing ${app.id} …`, 'dim')
          push(`Runtime ${app.runtime} installed (${app.size})`, 'dim')
          push(`installed ${app.name} — find it in the Dock and Launchpad`, 'ok')
        } else if (sub === 'remove' || sub === 'uninstall') {
          const target = operands[1]
          const app =
            FLATHUB.find((a) => a.id === target) ||
            FLATHUB.find((a) => a.name.toLowerCase() === String(target || '').toLowerCase())
          if (!app) {
            fail(`flatpak: no such application ${target || ''}`)
            break
          }
          const result = sys.uninstallFlatpak(app.id)
          if (!result.ok) fail(`flatpak: ${result.error}`)
          else push(`removed ${app.name}`, 'ok')
        } else if (sub === 'run') {
          const target = operands[1]
          const app =
            FLATHUB.find((a) => a.id === target) ||
            FLATHUB.find((a) => a.name.toLowerCase() === String(target || '').toLowerCase())
          if (!app) {
            fail(`flatpak: no such application ${target || ''}`)
            break
          }
          if (!sys.isFlatpakInstalled(app.id)) {
            fail(`flatpak: ${app.id} is not installed — "flatpak install ${app.id}"`)
            break
          }
          sys.openApp(flatpakKey(app.id))
          push(`launched ${app.name} in its sandbox`, 'dim')
        } else if (sub === 'info') {
          const target = operands[1]
          const app = FLATHUB.find((a) => a.id === target) || findFlatpak(target)[0]
          if (!app) {
            fail(`flatpak: no such application ${target || ''}`)
            break
          }
          push(`${app.name} — ${app.id}`, 'accent')
          push(`Version: ${app.version}`)
          push(`Publisher: ${app.publisher}`)
          push(`Runtime: ${app.runtime}`)
          push(`Size: ${app.size}`)
          push(`Ref: ${flatpakRef(app)}`)
          push(`Installed: ${sys.isFlatpakInstalled(app.id) ? 'yes' : 'no'}`)
          push(app.summary)
        } else if (sub === 'repair' || sub === 'update') {
          push('Checking flathub for updates…', 'dim')
          push(`All ${sys.flatpaks.length} installed Flatpaks are up to date.`, 'ok')
        } else {
          fail('flatpak: usage: flatpak list | search | install | remove | run | info | remotes | update')
        }
        break
      }

      case 'wifi': {
        const sub = operands[0] || 'status'
        if (sub === 'status') {
          if (sys.network.ssid) {
            const meta = scanNetwork().find((n) => n.ssid === sys.network.ssid)
            push(`Connected to ${sys.network.ssid} (${meta?.security === 'open' ? 'open' : 'WPA2'})`, 'ok')
            push(`  Signal: ${signalLabel(meta?.signal)} · ${meta?.band || '5 GHz'} · channel ${meta?.channel || 44}`)
            push(`  IP: 192.168.1.24 · DNS: 1.1.1.1, 9.9.9.9`)
          } else {
            push('Wi-Fi is off or not connected. Try "wifi list".', 'dim')
          }
        } else if (sub === 'list' || sub === 'scan') {
          push(`${pad('SSID', 22)}${pad('Security', 10)}${pad('Signal', 12)}Band`, 'dim')
          scanNetwork().forEach((n) => {
            const badge = sys.network.ssid === n.ssid ? '*' : ' '
            push(`${badge} ${pad(n.ssid, 20)}${pad(n.security === 'open' ? 'open' : 'WPA2', 10)}${pad(signalLabel(n.signal), 12)}${n.band}`)
          })
        } else if (sub === 'connect') {
          const ssid = operands[1]
          const password = operands[2]
          if (!ssid) {
            fail('wifi: usage: wifi connect <ssid> [password]')
            break
          }
          const result = sys.connectWifi(ssid, password)
          if (!result.ok) fail(`wifi: ${result.error}`)
          else push(`Connected to ${ssid}. Saved for next boot.`, 'ok')
        } else if (sub === 'off' || sub === 'disconnect') {
          sys.disconnectWifi()
          push('Wi-Fi disconnected.', 'dim')
        } else if (sub === 'forget') {
          const ssid = operands[1]
          if (!ssid) {
            fail('wifi: usage: wifi forget <ssid>')
            break
          }
          sys.forgetWifi(ssid)
          push(`Forgot ${ssid}.`, 'dim')
        } else {
          fail('wifi: usage: wifi [status|list|connect <ssid> <password>|off|forget <ssid>]')
        }
        break
      }

      case 'ip':
        push('1: lo: <LOOPBACK,UP,LOWER_UP>')
        push('    inet 127.0.0.1/8 scope host lo')
        if (sys.network.ssid) {
          push('2: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500')
          push('    inet 192.168.1.24/24 brd 192.168.1.255 scope global wlan0')
          push(`    ssid ${sys.network.ssid}`)
        } else {
          push('2: wlan0: <BROADCAST,MULTICAST> mtu 1500 (down)')
        }
        break

      case 'ping': {
        const host = operands[0]
        if (!host) {
          fail('ping: usage: ping <host>')
          break
        }
        if (!sys.network.ssid) {
          fail('ping: connect to Wi-Fi first')
          break
        }
        push(`PING ${host} (${host}) 56(84) bytes of data.`)
        for (let i = 1; i <= 3; i += 1) push(`64 bytes from ${host}: icmp_seq=${i} ttl=57 time=${12 + i}.${i} ms`)
        push('')
        push(`--- ${host} ping statistics ---`)
        push('3 packets transmitted, 3 received, 0% packet loss')
        break
      }

      case 'curl': {
        const url = operands[0]
        if (!url) {
          fail('curl: usage: curl <url>')
          break
        }
        if (!sys.network.ssid) {
          fail('curl: (6) Could not resolve host — no network connection')
          break
        }
        push(`<html><head><title>${url}</title></head><body>`, 'dim')
        push(`  Xenity's shell has no HTTP stack — open ${url} in Xenity Browser.`, 'dim')
        push('</body></html>', 'dim')
        break
      }

      case 'update': {
        const result = sys.runSystemUpdate()
        push('xenity-update', 'accent')
        push(result.log)
        if (result.removed.length) {
          push('removed:', 'dim')
          result.removed.forEach((p) => push(`  ${p}`, 'dim'))
        } else push('nothing to remove — the system is already clean.', 'dim')
        push('your files under /Users were not touched.', 'dim')
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
          'DE: Xenity Desktop',
          `Uptime: ${Math.floor(secs / 60)}m ${secs % 60}s`,
          `Packages: ${sys.appList.filter((a) => sys.isInstalled(a.id)).length} (pkg), ${sys.flatpaks.length} (flatpak)`,
          `Network: ${sys.network.ssid || 'offline'}`,
          `Storage: ${formatBytes(fs.totalSize())} used`,
          'Memory: 318 MB / 1024 MB',
        ]
        const rows = Math.max(logo.length, info.length)
        for (let i = 0; i < rows; i += 1) push(`${(logo[i] || '').padEnd(24)}${info[i] || ''}`, i === 0 ? 'accent' : 'out')
        break
      }

      case 'passwd':
        sys.openApp('settings', { section: 'account' })
        push('Change your password in Settings → Account.', 'dim')
        break

      case 'lock':
        nextCwd = cwd
        action = 'lock'
        break

      case 'screensaver':
        action = 'saver'
        break

      case 'nuke': {
        const removed = sys.nukeAll()
        push('nuking user data…', 'dim')
        push(`removed ${removed.files} files and ${removed.mb} of user data`, 'dim')
        push('kept /System, the default apps and your account', 'ok')
        push('your machine is a clean Xenity again', 'accent')
        break
      }

      case 'exit':
        action = 'close'
        break

      case 'reboot':
      case 'restart':
        action = 'restart'
        break

      case 'shutdown':
      case 'poweroff':
        action = 'shutdown'
        break

      default:
        fail(`${cmd}: command not found — try "help"`)
    }
  } catch (err) {
    fail(`${cmd}: ${err?.message || 'failed'}`)
  }

  if (redirect?.target && cmd !== 'echo') {
    const path = resolvePath(cwd, redirect.target)
    try {
      fs.write(path, `${out.map((l) => l.text).join('\n')}\n`)
      sys.commit()
      return { out: [{ kind: 'dim', text: `wrote ${prettyPath(path)}` }], cwd: nextCwd }
    } catch (err) {
      return { out: [...out, { kind: 'err', text: `${cmd}: ${err.message}` }], cwd: nextCwd }
    }
  }

  return { out, cwd: nextCwd, action }
}

export const shell = { runCommand, HELP, shellEnv, isFlatpakId, nowStamp }
