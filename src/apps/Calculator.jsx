import { useEffect, useState } from 'react'

const KEYS = [
  ['AC', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
]

const apply = (a, b, op) => {
  switch (op) {
    case '+':
      return a + b
    case '−':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? NaN : a / b
    default:
      return b
  }
}

const format = (n) => {
  if (!Number.isFinite(n)) return 'Error'
  const rounded = Math.round(n * 1e10) / 1e10
  return String(rounded)
}

export default function Calculator() {
  const [display, setDisplay] = useState('0')
  const [acc, setAcc] = useState(null)
  const [op, setOp] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [history, setHistory] = useState('')

  const press = (key) => {
    if (/[0-9]/.test(key)) {
      setDisplay((d) => (waiting || d === '0' ? key : d + key))
      setWaiting(false)
      return
    }
    if (key === '.') {
      if (waiting) {
        setDisplay('0.')
        setWaiting(false)
      } else if (!display.includes('.')) {
        setDisplay(display + '.')
      }
      return
    }
    if (key === 'AC') {
      setDisplay('0')
      setAcc(null)
      setOp(null)
      setWaiting(false)
      setHistory('')
      return
    }
    if (key === '±') {
      setDisplay((d) => (d.startsWith('-') ? d.slice(1) : '-' + d))
      return
    }
    if (key === '%') {
      setDisplay((d) => format(parseFloat(d) / 100))
      return
    }
    if (['+', '−', '×', '÷'].includes(key)) {
      const value = parseFloat(display)
      if (acc === null) {
        setAcc(value)
        setHistory(`${format(value)} ${key}`)
      } else if (op && !waiting) {
        const result = apply(acc, value, op)
        setAcc(result)
        setDisplay(format(result))
        setHistory(`${format(result)} ${key}`)
      } else {
        setHistory(`${format(acc)} ${key}`)
      }
      setOp(key)
      setWaiting(true)
      return
    }
    if (key === '=') {
      if (op === null) return
      const value = parseFloat(display)
      const result = apply(acc, value, op)
      setHistory(`${format(acc)} ${op} ${format(value)} =`)
      setDisplay(format(result))
      setAcc(null)
      setOp(null)
      setWaiting(true)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9.]$/.test(e.key)) press(e.key)
      else if (e.key === '+') press('+')
      else if (e.key === '-') press('−')
      else if (e.key === '*') press('×')
      else if (e.key === '/') press('÷')
      else if (e.key === 'Enter' || e.key === '=') press('=')
      else if (e.key === 'Escape') press('AC')
      else if (e.key === 'Backspace') setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : '0'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, acc, op, waiting])

  return (
    <div className="calc">
      <div className="calc-display">
        <span className="calc-history">{history || '\u00a0'}</span>
        <span className="calc-value">{display}</span>
      </div>
      <div className="calc-keys">
        {KEYS.map((row) => (
          <div className="calc-row" key={row.join()}>
            {row.map((key) => (
              <button
                key={key}
                className={`calc-key ${
                  ['+', '−', '×', '÷', '='].includes(key) ? 'op' : ''
                } ${['AC', '±', '%'].includes(key) ? 'fn' : ''} ${key === '0' ? 'wide' : ''}`}
                onClick={() => press(key)}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
