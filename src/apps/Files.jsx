import { useEffect, useMemo, useRef, useState } from 'react'
import { useSystem } from '../os/SystemContext'
import { HOME, baseName, formatBytes, joinPath, parentPath, prettyPath, resolvePath } from '../os/fs'
import { Icon } from '../components/Icons'

const SIDEBAR = [
  { label: 'Desktop', path: joinPath(HOME, 'Desktop') },
  { label: 'Documents', path: joinPath(HOME, 'Documents') },
  { label: 'Downloads', path: joinPath(HOME, 'Downloads') },
  { label: 'Pictures', path: joinPath(HOME, 'Pictures') },
  { label: 'Music', path: joinPath(HOME, 'Music') },
]

function FileGlyph({ type, big }) {
  if (type === 'dir') {
    return (
      <svg viewBox="0 0 40 32" width={big ? 46 : 18} height={big ? 37 : 15} aria-hidden="true">
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h7.2l3 3.5H34.5A2.5 2.5 0 0 1 37 10v15.5A2.5 2.5 0 0 1 34.5 28h-29A2.5 2.5 0 0 1 3 25.5z" fill="#5fb2ff" />
        <path d="M3 11h34v14.5A2.5 2.5 0 0 1 34.5 28h-29A2.5 2.5 0 0 1 3 25.5z" fill="#8ecbff" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 32 40" width={big ? 32 : 14} height={big ? 40 : 18} aria-hidden="true">
      <path d="M4 3h16l8 8v26H4z" fill="#fff" stroke="#d3dae4" />
      <path d="M20 3l8 8h-8z" fill="#e4edfa" />
      <path d="M9 17h14M9 22h14M9 27h9" stroke="#a9b4c2" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function Files({ win }) {
  const sys = useSystem()
  const start = win?.payload?.path || HOME
  const [path, setPath] = useState(start)
  const [hist, setHist] = useState([start])
  const [histIndex, setHistIndex] = useState(0)
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [dialog, setDialog] = useState(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (win?.payload?.path && win.payload.path !== path) {
      setPath(win.payload.path)
      setHist([win.payload.path])
      setHistIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win?.payload?.path])

  const entries = useMemo(() => {
    try {
      return sys.fs.list(path)
    } catch {
      return []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, sys.fsVersion])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, search])

  const navigate = (next) => {
    const target = resolvePath(path, next)
    if (!sys.fs.isDir(target)) return
    setPath(target)
    const nextHist = [...hist.slice(0, histIndex + 1), target]
    setHist(nextHist)
    setHistIndex(nextHist.length - 1)
    setSelected(null)
    setSearch('')
  }

  const go = (delta) => {
    const next = histIndex + delta
    if (next < 0 || next >= hist.length) return
    setHistIndex(next)
    setPath(hist[next])
    setSelected(null)
  }

  const openEntry = (entry) => {
    const full = joinPath(path, entry.name)
    if (entry.type === 'dir') navigate(entry.name)
    else sys.openApp('editor', { path: full })
  }

  const totalSize = visible.reduce((sum, e) => sum + e.size, 0)

  const submitDialog = () => {
    if (!dialog) return
    const value = (dialog.value || '').trim()
    try {
      if (dialog.kind === 'newfolder') {
        if (!value) return
        sys.fs.mkdir(joinPath(path, value))
        sys.commit()
      } else if (dialog.kind === 'newfile') {
        if (!value) return
        sys.fs.write(joinPath(path, value), '')
        sys.commit()
        sys.openApp('editor', { path: joinPath(path, value) })
      } else if (dialog.kind === 'rename') {
        if (!value || value === dialog.target) return
        sys.fs.move(joinPath(path, dialog.target), joinPath(path, value))
        sys.commit()
        setSelected(null)
      } else if (dialog.kind === 'delete') {
        sys.fs.remove(joinPath(path, dialog.target), { recursive: true })
        sys.commit()
        setSelected(null)
      }
    } catch (err) {
      sys.notify('Files', err.message)
    }
    setDialog(null)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && selected) {
      const entry = entries.find((entry) => entry.name === selected)
      if (entry) openEntry(entry)
    }
    if ((e.key === 'Backspace' || e.key === 'Delete') && selected && document.activeElement === e.currentTarget) {
      setDialog({ kind: 'delete', target: selected })
    }
  }

  const currentEntry = entries.find((e) => e.name === selected)

  return (
    <div className="files" tabIndex={0} onKeyDown={onKeyDown}>
      <aside className="files-side">
        <h4>Favourites</h4>
        <button className={path === HOME ? 'active' : ''} onClick={() => navigate(HOME)}>
          <Icon name="drive" size={15} /> {sys.settings.user}
        </button>
        {SIDEBAR.map((item) => (
          <button
            key={item.path}
            className={path === item.path ? 'active' : ''}
            onClick={() => navigate(item.path)}
          >
            <Icon name="folder" size={15} /> {item.label}
          </button>
        ))}
        <h4>Locations</h4>
        <button className={path === '/' ? 'active' : ''} onClick={() => navigate('/')}>
          <Icon name="drive" size={15} /> Xenity Drive
        </button>
        <button className={path === '/Applications' ? 'active' : ''} onClick={() => navigate('/Applications')}>
          <Icon name="grid" size={15} /> Applications
        </button>
        <button className={path === '/System' ? 'active' : ''} onClick={() => navigate('/System')}>
          <Icon name="gear" size={15} /> System
        </button>
      </aside>

      <div className="files-main">
        <div className="files-toolbar">
          <div className="seg">
            <button onClick={() => go(-1)} disabled={histIndex <= 0} aria-label="Back">
              <Icon name="chevronLeft" size={16} />
            </button>
            <button onClick={() => go(1)} disabled={histIndex >= hist.length - 1} aria-label="Forward">
              <Icon name="chevronRight" size={16} />
            </button>
            <button onClick={() => navigate(parentPath(path))} disabled={path === '/'} aria-label="Up">
              <Icon name="chevronUp" size={16} />
            </button>
          </div>
          <span className="files-title">{prettyPath(path)}</span>
          <div className="files-actions">
            <label className="files-search">
              <Icon name="search" size={14} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                aria-label="Search this folder"
              />
            </label>
            <button
              className="icon-btn"
              title="New folder"
              onClick={() => setDialog({ kind: 'newfolder', value: 'untitled folder' })}
            >
              <Icon name="folder" size={16} />
            </button>
            <button
              className="icon-btn"
              title="New file"
              onClick={() => setDialog({ kind: 'newfile', value: 'untitled.txt' })}
            >
              <Icon name="file" size={16} />
            </button>
            <button
              className="icon-btn"
              title="Rename"
              disabled={!selected}
              onClick={() => selected && setDialog({ kind: 'rename', value: selected, target: selected })}
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              className="icon-btn danger"
              title="Move to Trash"
              disabled={!selected}
              onClick={() => selected && setDialog({ kind: 'delete', target: selected })}
            >
              <Icon name="trash" size={16} />
            </button>
            <button
              className="icon-btn"
              title={view === 'grid' ? 'List view' : 'Icon view'}
              onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            >
              <Icon name={view === 'grid' ? 'list' : 'grid'} size={16} />
            </button>
          </div>
        </div>

        {view === 'grid' ? (
          <div className="files-grid" onClick={() => setSelected(null)}>
            {visible.map((entry) => (
              <button
                key={entry.name}
                className={`file-item ${selected === entry.name ? 'sel' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(entry.name)
                }}
                onDoubleClick={() => openEntry(entry)}
              >
                <FileGlyph type={entry.type} big />
                <span className="name">{entry.name}</span>
              </button>
            ))}
            {!visible.length && (
              <p className="files-empty">{search ? 'Nothing matches your search.' : 'This folder is empty.'}</p>
            )}
          </div>
        ) : (
          <div className="files-list" onClick={() => setSelected(null)}>
            <div className="files-row head">
              <span>Name</span>
              <span>Size</span>
              <span>Kind</span>
            </div>
            {visible.map((entry) => (
              <button
                key={entry.name}
                className={`files-row ${selected === entry.name ? 'sel' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(entry.name)
                }}
                onDoubleClick={() => openEntry(entry)}
              >
                <span className="name">
                  <FileGlyph type={entry.type} /> {entry.name}
                </span>
                <span>{entry.type === 'dir' ? '—' : formatBytes(entry.size)}</span>
                <span>{entry.type === 'dir' ? 'Folder' : baseName(entry.name).includes('.') ? baseName(entry.name).split('.').pop().toUpperCase() : 'Document'}</span>
              </button>
            ))}
          </div>
        )}

        <div className="files-foot">
          {currentEntry ? `${currentEntry.name} — ${formatBytes(currentEntry.size)}` : `${visible.length} items · ${formatBytes(totalSize)}`}
        </div>
      </div>

      {dialog && (
        <div className="dialog-backdrop" onPointerDown={() => setDialog(null)}>
          <div className="dialog" onPointerDown={(e) => e.stopPropagation()}>
            <h3>
              {dialog.kind === 'newfolder' && 'New folder'}
              {dialog.kind === 'newfile' && 'New file'}
              {dialog.kind === 'rename' && 'Rename'}
              {dialog.kind === 'delete' && 'Move to Trash'}
            </h3>
            {dialog.kind === 'delete' ? (
              <p>
                Delete <strong>{dialog.target}</strong>? This cannot be undone.
              </p>
            ) : (
              <input
                autoFocus
                value={dialog.value}
                onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitDialog()
                  if (e.key === 'Escape') setDialog(null)
                }}
                aria-label="Name"
              />
            )}
            <div className="dialog-actions">
              <button onClick={() => setDialog(null)}>Cancel</button>
              <button className="primary" onClick={submitDialog}>
                {dialog.kind === 'delete' ? 'Delete' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
