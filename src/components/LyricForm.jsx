import { useState } from 'react'

export default function LyricForm({ onSubmit, initialValues = {}, submitLabel = 'Set current lyric', isLoading = false, error = null }) {
  const [content, setContent] = useState(initialValues.content || '')
  const [songTitle, setSongTitle] = useState(initialValues.songTitle || '')
  const [artistName, setArtistName] = useState(initialValues.artistName || '')
  const [showOptional, setShowOptional] = useState(
    !!(initialValues.songTitle || initialValues.artistName)
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      content: content.trim(),
      songTitle: songTitle.trim() || null,
      artistName: artistName.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      {error && (
        <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste or type a lyric"
        rows={4}
        className="w-full px-4 py-3 text-lg bg-transparent border border-charcoal/20
                   focus:border-charcoal/40 focus:outline-none resize-none
                   placeholder:text-charcoal-light/50 text-charcoal"
        autoFocus
      />

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

      {!showOptional ? (
        <button
          type="button"
          onClick={() => setShowOptional(true)}
          className="mt-3 text-sm text-charcoal-light hover:text-charcoal transition-colors"
        >
          + Add song & artist
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            placeholder="Song title (optional)"
            className="w-full px-4 py-2 text-sm bg-transparent border border-charcoal/20
                       focus:border-charcoal/40 focus:outline-none
                       placeholder:text-charcoal-light/50 text-charcoal"
          />
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Artist (optional)"
            className="w-full px-4 py-2 text-sm bg-transparent border border-charcoal/20
                       focus:border-charcoal/40 focus:outline-none
                       placeholder:text-charcoal-light/50 text-charcoal"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={!content.trim() || isLoading}
        className="mt-6 w-full py-3 text-sm font-medium text-charcoal
                   border border-charcoal/30 hover:border-charcoal/60
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors"
      >
        {isLoading ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
