import { useState, useRef, useEffect } from 'react'
import { useLyric } from '../contexts/LyricContext'

/**
 * NoteEditor: Where interpretation lives
 *
 * A lyric answers: "What line stayed with me?"
 * A note answers: "Why did it stay?"
 *
 * Design principles:
 * - User voice first (never AI-generated)
 * - Private by default (feels like margin scribbles)
 * - Optional, never demanding (silence is allowed)
 * - Interpretive, not analytical (why it mattered, not what it means)
 */

const GENTLE_PROMPTS = [
  "why did this line stay with you?",
  "what did this lyric capture for you?",
  "what made this resonate?",
  "why does this matter to you?"
]

export default function NoteEditor({ lyricId, initialNote, className = '', onEditStateChange }) {
  const { saveNote } = useLyric()
  const [note, setNote] = useState(initialNote?.content || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const textareaRef = useRef(null)
  const hasNote = note && note.trim().length > 0

  // Notify parent of edit state changes
  useEffect(() => {
    if (onEditStateChange) {
      onEditStateChange(isEditing)
    }
  }, [isEditing, onEditStateChange])

  // Random prompt for variety (but consistent per mount)
  const [prompt] = useState(() =>
    GENTLE_PROMPTS[Math.floor(Math.random() * GENTLE_PROMPTS.length)]
  )

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [note, isEditing])

  // Focus when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  async function handleSave() {
    if (isSaving) return

    setIsSaving(true)
    try {
      await saveNote(lyricId, note.trim())
      setIsEditing(false)

      // Quiet, ephemeral save confirmation
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 1500)
    } catch (err) {
      console.error('Error saving note:', err)
      // Silent failure - don't disrupt the reflective mood
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    setNote(initialNote?.content || '')
    setIsEditing(false)
  }

  function handleKeyDown(e) {
    // Save on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    // Cancel on Escape
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  // Display mode (with note)
  if (!isEditing && hasNote) {
    return (
      <div
        className={`group relative mt-4 ${className}`}
      >
        {/* The note itself - margin scribble aesthetic */}
        <div
          className="px-4 py-3 text-xs leading-relaxed text-charcoal/40 italic border-l-2 border-charcoal/10 cursor-text transition-colors hover:border-charcoal/20 hover:text-charcoal/50"
          style={{ fontFamily: 'Georgia, serif' }}
          onClick={() => setIsEditing(true)}
        >
          {note}
        </div>

        {/* Subtle edit affordance (appears on hover) */}
        <button
          className="absolute right-2 top-2 text-xs text-charcoal/20 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          edit
        </button>

        {/* Quiet saved indicator */}
        {showSaved && (
          <div className="absolute right-2 bottom-2 text-xs text-charcoal/30 italic">
            saved
          </div>
        )}
      </div>
    )
  }

  // Edit mode OR empty state
  if (isEditing || !hasNote) {
    return (
      <div className={`mt-4 ${className}`}>
        {/* Empty state prompt (when no note exists and not editing) */}
        {!isEditing && !hasNote && (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full px-4 py-3 text-left text-xs leading-relaxed text-charcoal/25 italic border border-charcoal/10 rounded-sm bg-charcoal/5 hover:bg-charcoal/8 hover:border-charcoal/15 hover:text-charcoal/35 transition-all cursor-text"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {prompt}
          </button>
        )}

        {/* Editing surface */}
        {isEditing && (
          <div>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={prompt}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 text-xs leading-relaxed text-charcoal/60 italic border-l-2 border-charcoal/20 bg-transparent focus:outline-none focus:border-charcoal/30 resize-none placeholder:text-charcoal/20"
              style={{
                fontFamily: 'Georgia, serif',
                minHeight: '60px'
              }}
            />

            {/* Quiet controls */}
            <div className="flex items-center justify-between mt-2 px-2">
              <span className="text-xs text-charcoal/30">
                {note.length}/500
              </span>

              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
                  disabled={isSaving}
                >
                  cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || note.trim().length === 0}
                  className="text-xs text-charcoal/50 hover:text-charcoal disabled:text-charcoal/20 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'saving...' : 'save'}
                </button>
              </div>
            </div>

            <p className="text-xs text-charcoal/25 mt-3 px-2 italic">
              ⌘ + enter to save, esc to cancel
            </p>
          </div>
        )}
      </div>
    )
  }

  return null
}
