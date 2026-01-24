import { useState, useRef, useEffect } from 'react'
import { useLyric } from '../contexts/LyricContext'

/**
 * NoteEditor: Marginalia for your lyrics
 *
 * Feels like a handwritten note tucked beside the lyric —
 * not a form to fill out.
 */

const GENTLE_PROMPTS = [
  "why did this stay with you?",
  "what does this capture?",
  "what made this resonate?",
]

export default function NoteEditor({ lyricId, initialNote, className = '', onEditStateChange, showVisibilityToggle = false }) {
  const { saveNote } = useLyric()
  const [note, setNote] = useState(initialNote?.content || '')
  const [savedNote, setSavedNote] = useState(initialNote?.content || '')
  const [isPublic, setIsPublic] = useState(initialNote?.is_public || false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef(null)
  const hasNote = note && note.trim().length > 0

  const [prompt] = useState(() =>
    GENTLE_PROMPTS[Math.floor(Math.random() * GENTLE_PROMPTS.length)]
  )

  // Only sync from parent when initialNote actually changes (external update)
  // Don't sync based on isEditing - that would reset after local saves
  useEffect(() => {
    const content = initialNote?.content || ''
    setSavedNote(content)
    setIsPublic(initialNote?.is_public || false)
    // Only update note if not currently editing
    if (!isEditing) {
      setNote(content)
    }
  }, [initialNote?.content, initialNote?.is_public])

  useEffect(() => {
    if (onEditStateChange) {
      onEditStateChange(isEditing)
    }
  }, [isEditing, onEditStateChange])

  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(60, textareaRef.current.scrollHeight) + 'px'
    }
  }, [note, isEditing])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  async function handleSave() {
    if (isSaving) return
    if (note.trim() === savedNote) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await saveNote(lyricId, note.trim(), isPublic)
      setSavedNote(note.trim())
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving note:', err)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTogglePublic() {
    if (isSaving || !hasNote) return
    const newIsPublic = !isPublic
    setIsPublic(newIsPublic)
    setIsSaving(true)
    try {
      await saveNote(lyricId, note.trim(), newIsPublic)
    } catch (err) {
      console.error('Error toggling note visibility:', err)
      setIsPublic(!newIsPublic) // revert on error
    } finally {
      setIsSaving(false)
    }
  }

  async function handleClear() {
    if (isSaving) return
    setIsSaving(true)
    try {
      await saveNote(lyricId, '')
      setNote('')
      setSavedNote('')
      setIsEditing(false)
    } catch (err) {
      console.error('Error clearing note:', err)
    } finally {
      setIsSaving(false)
    }
  }

  function handleBlur(e) {
    // Don't save on blur if clicking inside the component
    if (e.relatedTarget?.closest('.note-editor')) return
    handleSave()
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setNote(savedNote)
      setIsEditing(false)
    }
  }

  // Display mode (with note)
  if (!isEditing && hasNote) {
    return (
      <div
        className={`note-editor relative ${className}`}
        style={{
          transform: 'rotate(-0.5deg)',
          transformOrigin: 'left top',
        }}
      >
        <div
          onClick={() => setIsEditing(true)}
          className="cursor-text pl-4 py-2 border-l-2 border-charcoal/10 hover:border-charcoal/20 transition-colors"
        >
          <p
            className="text-sm text-charcoal/50 leading-relaxed"
            style={{ fontFamily: "'Caveat', cursive", fontSize: '1.25rem' }}
          >
            {note}
          </p>
        </div>

        {/* Visibility toggle - only show on home */}
        {showVisibilityToggle && (
          <button
            onClick={handleTogglePublic}
            disabled={isSaving}
            className="mt-2 ml-4 text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors flex items-center gap-1.5"
          >
            {isPublic ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                visible on explore
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                private note
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  // Edit mode OR empty state
  return (
    <div
      className={`note-editor ${className}`}
      style={{
        transform: 'rotate(-0.5deg)',
        transformOrigin: 'left top',
      }}
    >
      {!isEditing && !hasNote ? (
        // Empty state - gentle invitation
        <button
          onClick={() => setIsEditing(true)}
          className="text-left pl-4 py-2 border-l-2 border-transparent hover:border-charcoal/10 transition-all group"
        >
          <p
            className="text-charcoal/20 group-hover:text-charcoal/35 transition-colors"
            style={{ fontFamily: "'Caveat', cursive", fontSize: '1.25rem' }}
          >
            {prompt}
          </p>
        </button>
      ) : isEditing ? (
        // Editing
        <div className="pl-4 border-l-2 border-charcoal/20">
          <textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={prompt}
            className="w-full bg-transparent text-charcoal/60 leading-relaxed resize-none focus:outline-none placeholder:text-charcoal/25"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1.25rem',
              minHeight: '60px',
            }}
          />
          <div className="flex items-center gap-3 mt-1 text-xs text-charcoal/30">
            <span>{isSaving ? 'saving...' : 'auto-saves'}</span>
            <span className="text-charcoal/20">·</span>
            <span>esc to cancel</span>
            {(note.trim() || savedNote) && (
              <>
                <span className="text-charcoal/20">·</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-charcoal/30 hover:text-charcoal/50 transition-colors"
                >
                  clear
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
