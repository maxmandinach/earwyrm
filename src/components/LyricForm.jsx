import { useState } from 'react'

export default function LyricForm({ onSubmit, initialValues = {}, isLoading = false, error = null }) {
  const [content, setContent] = useState(initialValues.content || '')
  const [songTitle, setSongTitle] = useState(initialValues.songTitle || '')
  const [artistName, setArtistName] = useState(initialValues.artistName || '')

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

      {/* Signature style card */}
      <div
        className="p-6 border border-charcoal/10"
        style={{ backgroundColor: '#FBF8F3' }}
      >
        {/* Lyric */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or type a lyric"
          rows={4}
          className="w-full bg-transparent focus:outline-none resize-none placeholder:opacity-40"
          style={{
            fontFamily: "'Caveat', cursive",
            fontSize: '1.875rem',
            fontWeight: 500,
            lineHeight: 1.5,
            color: '#3D3226',
          }}
          autoFocus
        />

        {/* Song & Artist - integrated */}
        <div className="mt-4 pt-4 border-t border-charcoal/10 space-y-2">
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            placeholder="Song title"
            className="w-full bg-transparent focus:outline-none placeholder:opacity-30"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1.25rem',
              color: '#8B7355',
            }}
          />
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Artist"
            className="w-full bg-transparent focus:outline-none placeholder:opacity-30"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1.25rem',
              color: '#8B7355',
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
            backgroundColor: isLoading ? '#3D3226' : '#FBF8F3',
            color: isLoading ? '#FBF8F3' : '#3D3226',
            border: '2px solid #3D3226',
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
