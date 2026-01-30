import { useState, useRef, useEffect } from 'react'
import SuggestMatches from './SuggestMatches'

export default function LyricForm({ onSubmit, initialValues = {}, isLoading = false, error = null }) {
  const [content, setContent] = useState(initialValues.content || '')
  const [songTitle, setSongTitle] = useState(initialValues.songTitle || '')
  const [artistName, setArtistName] = useState(initialValues.artistName || '')
  const [canonicalLyricId, setCanonicalLyricId] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [preMatchContent, setPreMatchContent] = useState('')
  const textareaRef = useRef(null)

  const handleMatchSelect = (match) => {
    if (match) {
      setPreMatchContent(content)
      setContent(match.content)
      if (match.artistName) setArtistName(match.artistName)
      if (match.songTitle) setSongTitle(match.songTitle)
      setCanonicalLyricId(match.id)
      setIsLocked(true)
    } else if (isLocked) {
      setContent(preMatchContent)
      setArtistName('')
      setCanonicalLyricId(null)
      setIsLocked(false)
    } else {
      setCanonicalLyricId(null)
    }
  }

  const handleClearLock = () => {
    setContent('')
    setSongTitle('')
    setArtistName('')
    setCanonicalLyricId(null)
    setIsLocked(false)
  }

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(100, textareaRef.current.scrollHeight) + 'px'
    }
  }, [content])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      content: content.trim(),
      songTitle: songTitle.trim() || null,
      artistName: artistName.trim() || null,
      canonicalLyricId,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      {error && (
        <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      {/* Signature style card */}
      <div
        className="p-6 border border-charcoal/10"
        style={{ backgroundColor: 'var(--surface-elevated, #F5F0E8)' }}
      >
        {/* Lyric */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { if (!isLocked) setContent(e.target.value) }}
            readOnly={isLocked}
            placeholder="Paste or type a lyric"
            rows={4}
            className={`w-full bg-transparent focus:outline-none resize-none placeholder:opacity-60 ${isLocked ? 'opacity-70' : ''}`}
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1.875rem',
              fontWeight: 500,
              lineHeight: 1.5,
              color: 'var(--text-primary, #2C2825)',
            }}
            autoFocus={!isLocked}
          />
          {isLocked && (
            <button
              type="button"
              onClick={handleClearLock}
              className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal/10 hover:bg-charcoal/20 text-charcoal/60 hover:text-charcoal transition-colors"
              aria-label="Clear matched lyric"
            >
              ×
            </button>
          )}
        </div>

        {/* Suggest matches — searches as user types lyric or song title */}
        {!isLocked && (
          <SuggestMatches content={content} songTitle={songTitle} onSelect={handleMatchSelect} />
        )}

        {/* Song & Artist - integrated */}
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
              color: 'var(--text-secondary, #6B635A)',
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
              color: 'var(--text-secondary, #6B635A)',
            }}
          />
        </div>
      </div>

      {content && (
        <button
          type="button"
          onClick={() => {
            setContent('')
            setSongTitle('')
            setArtistName('')
          }}
          className="mt-2 text-xs text-charcoal-light hover:text-charcoal transition-colors"
        >
          Clear
        </button>
      )}

      {/* Save button - ceremonial */}
      <div className="mt-8 flex justify-center">
        <button
          type="submit"
          disabled={!content.trim() || isLoading}
          className="px-12 py-4 text-lg font-medium transition-all duration-300"
          style={{
            fontFamily: "'Caveat', cursive",
            backgroundColor: isLoading ? 'var(--text-primary, #2C2825)' : 'var(--surface-elevated, #F5F0E8)',
            color: isLoading ? 'var(--surface-bg, #F5F0E8)' : 'var(--text-primary, #2C2825)',
            border: '2px solid var(--text-primary, #2C2825)',
            opacity: !content.trim() ? 0.4 : 1,
            cursor: !content.trim() || isLoading ? 'not-allowed' : 'pointer',
            transform: isLoading ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
