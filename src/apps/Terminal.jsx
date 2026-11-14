import { useEffect, useRef, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { HOME, prettyPath } from '../os/fs'
import { runCommand } from '../os/shell'

const BANNER = [
  'Xenity 1.4.1 (Nova) — xsh 3.2',
  'Type "help" for all commands, "neofetch" for system info, "flatpak search chrome" for Flathub.',
]

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

  const prompt = `${sys.settings.user}@xenity ${prettyPath(cwd)} %`

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = (raw) => {
    const line = raw.trim()
    const echoed = { kind: 'cmd', text: `${prompt} ${raw}` }
    if (!line) {
      setLines((l) => [...l, echoed])
      setInput('')
      return
    }
    const result = runCommand(line, { cwd, sys, history })
    const tagged = (result.out || []).map((entry) => ({ ...entry, id: ++seq.current }))

    if (result.action === 'clear') {
      setLines([])
    } else {
      setLines((l) => [...l, echoed, ...tagged])
    }
    if (result.cwd) setCwd(result.cwd)
    setHistory((h) => [...h, line])
    setHistoryIndex(-1)
    setInput('')

    if (result.action === 'close') window.setTimeout(() => sys.closeWindow(win.id), 0)
    if (result.action === 'restart') sys.restart()
    if (result.action === 'shutdown') sys.powerOff()
    if (result.action === 'lock') sys.lock()
    if (result.action === 'saver') sys.startScreensaver()
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
