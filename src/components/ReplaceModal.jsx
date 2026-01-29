import { useState, useRef, useEffect } from 'react'
import TagInput from './TagInput'
import ModalSheet from './ModalSheet'

export default function ReplaceModal({ onReplace, onClose, allUserTags = [] }) {
  const [content, setContent] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [artistName, setArtistName] = useState('')
  const [tags, setTags] = useState([])
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || saveState !== 'idle') return

    setSaveState('saving')
    setError(null)
    try {
      await onReplace({
        content: content.trim(),
        songTitle: songTitle.trim() || null,
        artistName: artistName.trim() || null,
        tags: tags,
      })

      setSaveState('saved')
      setTimeout(() => {
        onClose()
      }, 600)
    } catch (err) {
      console.error('Error creating lyric:', err)
      setError(err.message || 'Failed to save lyric. Please try again.')
      setSaveState('idle')
    }
  }

  // Auto-expand textarea
  const textareaRef = useRef(null)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(100, textareaRef.current.scrollHeight) + 'px'
    }
  }, [content])

  return (
    <ModalSheet onClose={onClose} title="New lyric" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col">
          {/* Gentle note */}
          <p
            className="mb-6 text-center opacity-70"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1.125rem',
              color: 'var(--text-secondary, #6B635A)',
            }}
          >
            Your current lyric will move to Memory Lane
          </p>

          {error && (
            <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          {/* Signature style card */}
          <div className="w-full max-w-md mx-auto">
            <div
              className="p-6 border border-charcoal/10"
              style={{ backgroundColor: 'var(--surface-elevated, #F5F0E8)' }}
            >
              {/* Lyric */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's stuck in your head?"
                rows={4}
                className="w-full bg-transparent focus:outline-none resize-none placeholder:opacity-60"
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: '1.875rem',
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
                autoFocus
              />

              {/* Song & Artist */}
              <div className="mt-4 pt-4 border-t border-charcoal/10 space-y-2">
                <input
                  type="text"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="Song title"
                  className="w-full bg-transparent focus:outline-none placeholder:opacity-50"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: '0.9375rem',
                  }}
                />
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Artist"
                  className="w-full bg-transparent focus:outline-none placeholder:opacity-50"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="mt-6 w-full max-w-md mx-auto">
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={allUserTags}
              showSuggestionsOnFocus
            />
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-8 flex justify-center">
            <button
              type="submit"
              disabled={!content.trim() || saveState !== 'idle'}
              className="px-12 py-4 text-lg font-medium transition-all duration-300"
              style={{
                fontFamily: "'Caveat', cursive",
                backgroundColor: saveState === 'saved' ? 'var(--text-primary, #2C2825)' : 'var(--surface-elevated, #F5F0E8)',
                color: saveState === 'saved' ? 'var(--surface-bg, #F5F0E8)' : 'var(--text-primary, #2C2825)',
                border: '2px solid var(--text-primary, #2C2825)',
                opacity: !content.trim() ? 0.4 : 1,
                cursor: !content.trim() ? 'not-allowed' : 'pointer',
                transform: saveState === 'saved' ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && 'Saved!'}
              {saveState === 'idle' && 'Save & Replace'}
            </button>
          </div>
        </form>
    </ModalSheet>
  )
}
