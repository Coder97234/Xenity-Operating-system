import { useEffect, useRef, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { baseName } from '../os/fs'

export default function TextEditor({ win }) {
  const sys = useSystem()
  const path = win?.payload?.path
  const [value, setValue] = useState(() => {
    if (!path) return ''
    try {
      return sys.fs.read(path)
    } catch {
      return ''
    }
  })
  const [saved, setSaved] = useState(value)
  const [error, setError] = useState('')
  const areaRef = useRef(null)
  const dirty = value !== saved

  const save = () => {
    if (!path) return
    try {
      sys.fs.write(path, value)
      sys.commit()
      setSaved(value)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!path) {
    return (
      <div className="editor empty">
        <p>No file open.</p>
      </div>
    )
  }

  return (
    <div className="editor">
      <div className="editor-bar">
        <span className="editor-path">{path}</span>
        <span className={`editor-state ${dirty ? 'dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'Saved'}</span>
        <button className="primary small" onClick={save} disabled={!dirty}>
          Save
        </button>
      </div>
      {error && <p className="editor-error">{error}</p>}
      <textarea
        ref={areaRef}
        className="editor-area"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
        aria-label={`Editing ${baseName(path)}`}
      />
      <div className="editor-foot">
        <span>{value.split('\n').length} lines</span>
        <span>{value.length} characters</span>
        <span>{baseName(path)}</span>
      </div>
    </div>
  )
}
