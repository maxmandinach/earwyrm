import { useState } from 'react'
import NoteEditor from './NoteEditor'

export default function NotePeek({ notes, isOwn, lyricId, initialNote, onNoteChange }) {
  const [expanded, setExpanded] = useState(false)

  // Own card: render NoteEditor directly
  if (isOwn) {
    return (
      <div className="w-full max-w-lg mx-auto mt-4">
        <NoteEditor
          lyricId={lyricId}
          initialNote={initialNote}
          onNoteChange={onNoteChange}
          showVisibilityToggle
        />
      </div>
    )
  }

  // Other cards: show peek of first public note
  if (!notes || notes.length === 0) return null

  const firstNote = notes[0]

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full max-w-lg mx-auto mt-4 text-left pl-4 border-l-2 border-charcoal/10"
        style={{ transform: 'rotate(-0.5deg)', transformOrigin: 'left top' }}
      >
        <p
          className="text-charcoal/50 leading-relaxed line-clamp-2"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '1.25rem' }}
        >
          {firstNote.content}
        </p>
        {notes.length > 1 && (
          <span className="text-xs text-charcoal/30 mt-1 inline-block">
            +{notes.length - 1} more
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto mt-4 space-y-3">
      {notes.map((note, i) => (
        <div
          key={note.id || i}
          className="pl-4 border-l-2 border-charcoal/10"
          style={{ transform: 'rotate(-0.5deg)', transformOrigin: 'left top' }}
        >
          <p
            className="text-charcoal/50 leading-relaxed"
            style={{ fontFamily: "'Caveat', cursive", fontSize: '1.25rem' }}
          >
            {note.content}
          </p>
          {note.note_types && note.note_types.length > 0 && (
            <div className="flex gap-2 mt-1">
              {note.note_types.map(t => (
                <span key={t} className="text-xs text-charcoal/25 border border-charcoal/10 px-1.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          )}
          {note.profiles?.username && (
            <span className="text-xs text-charcoal/30 mt-1 inline-block">
              @{note.profiles.username}
            </span>
          )}
        </div>
      ))}
      <button
        onClick={() => setExpanded(false)}
        className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
      >
        collapse
      </button>
    </div>
  )
}
