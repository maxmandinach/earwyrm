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

      // Update initialNote so cancel works correctly next time
      initialNote = { content: note.trim() }

      setIsEditing(false)

      // Brief save confirmation with slight animation
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    } catch (err) {
      console.error('Error saving note:', err)
      // Silent failure - don't disrupt the reflective mood
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    // Restore original note, don't clear it
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
        className={`group relative mt-4 animate-in fade-in duration-300 ${className}`}
      >
        {/* The note itself - margin scribble aesthetic (not blockquote) */}
        <div
          className="px-5 py-3 text-xs leading-loose text-charcoal/45 italic bg-charcoal/[0.02] cursor-text transition-all hover:bg-charcoal/[0.04] hover:text-charcoal/55"
          style={{ fontFamily: 'Georgia, serif' }}
          onClick={() => setIsEditing(true)}
        >
          {note}
        </div>

        {/* Subtle edit affordance (always visible but quiet) */}
        <button
          className="absolute right-2 top-2 text-xs text-charcoal/25 hover:text-charcoal/50 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          edit
        </button>

        {/* Save confirmation - more visible */}
        {showSaved && (
          <div className="absolute right-2 bottom-2 text-xs text-charcoal/40 italic animate-in fade-in duration-200">
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
            className="w-full px-5 py-3 text-left text-xs leading-loose text-charcoal/25 italic border border-charcoal/10 bg-charcoal/[0.02] hover:bg-charcoal/[0.04] hover:border-charcoal/15 hover:text-charcoal/35 transition-all cursor-text"
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
              className="w-full px-5 py-3 text-xs leading-loose text-charcoal/60 italic border border-charcoal/20 bg-charcoal/[0.02] focus:outline-none focus:border-charcoal/30 focus:bg-charcoal/[0.04] resize-none placeholder:text-charcoal/25"
              style={{
                fontFamily: 'Georgia, serif',
                minHeight: '80px'
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
