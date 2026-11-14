import { useEffect, useState } from 'react'
import { Icon } from '../components/Icons'

const NOTES_KEY = 'xenity.user.notes'
const uid = () => `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`

const seed = () => [
  {
    id: uid(),
    title: 'Welcome to Notes',
    body: 'Notes stay on this machine, inside Xenity Drive.\n\nThey are user data, so a system update never removes them.',
    updated: Date.now(),
  },
]

const load = () => {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* ignore */
  }
  return seed()
}

export default function Notes() {
  const [notes, setNotes] = useState(load)
  const [activeId, setActiveId] = useState(() => load()[0]?.id)

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
    } catch {
      /* ignore */
    }
  }, [notes])

  const active = notes.find((n) => n.id === activeId) || notes[0]

  const update = (patch) => {
    setNotes((list) =>
      list.map((n) => (n.id === active.id ? { ...n, ...patch, updated: Date.now() } : n))
    )
  }

  const add = () => {
    const note = { id: uid(), title: 'New note', body: '', updated: Date.now() }
    setNotes((list) => [note, ...list])
    setActiveId(note.id)
  }

  const remove = (id) => {
    const next = notes.filter((n) => n.id !== id)
    setNotes(next)
    if (activeId === id) setActiveId(next[0]?.id)
  }

  return (
    <div className="notes">
      <aside className="notes-list">
        <div className="notes-list-head">
          <span>Notes</span>
          <button className="icon-btn" onClick={add} title="New note" aria-label="New note">
            <Icon name="plus" size={15} />
          </button>
        </div>
        {notes.map((note) => (
          <button
            key={note.id}
            className={`notes-item ${note.id === active?.id ? 'active' : ''}`}
            onClick={() => setActiveId(note.id)}
          >
            <strong>{note.title || 'Untitled'}</strong>
            <small>{new Date(note.updated).toLocaleDateString()}</small>
          </button>
        ))}
      </aside>
      <div className="notes-editor">
        {active ? (
          <>
            <div className="notes-toolbar">
              <input
                className="notes-title"
                value={active.title}
                onChange={(e) => update({ title: e.target.value })}
                aria-label="Note title"
              />
              <button className="icon-btn danger" onClick={() => remove(active.id)} title="Delete note" aria-label="Delete note">
                <Icon name="trash" size={15} />
              </button>
            </div>
            <textarea
              className="notes-body"
              value={active.body}
              onChange={(e) => update({ body: e.target.value })}
              placeholder="Start writing…"
              aria-label="Note body"
            />
          </>
        ) : (
          <p className="files-empty">No notes yet.</p>
        )}
      </div>
    </div>
  )
}
