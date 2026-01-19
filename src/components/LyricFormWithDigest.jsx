import { useState } from 'react'
import DigestExplanation from './DigestExplanation'

/**
 * Example: LyricForm with Digest opt-in integrated
 * This shows how the digest toggle would be added to the existing form
 */
export default function LyricFormWithDigest({
  onSubmit,
  initialValues = {},
  submitLabel = 'Set current lyric',
  isLoading = false,
  error = null,
  defaultIncludeInDigest = false, // From user settings
  showDigestOption = true // Hide for replacements, show for new lyrics
}) {
  const [content, setContent] = useState(initialValues.content || '')
  const [songTitle, setSongTitle] = useState(initialValues.songTitle || '')
  const [artistName, setArtistName] = useState(initialValues.artistName || '')
  const [showOptional, setShowOptional] = useState(
    !!(initialValues.songTitle || initialValues.artistName)
  )

  // New: Digest opt-in state
  const [includeInDigest, setIncludeInDigest] = useState(defaultIncludeInDigest)
  const [showDigestExplanation, setShowDigestExplanation] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      content: content.trim(),
      songTitle: songTitle.trim() || null,
      artistName: artistName.trim() || null,
      includeInDigest, // Pass digest preference to parent
    })
  }

  return (
    <>
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

        {/* New: Digest opt-in section */}
        {showDigestOption && (
          <div className="mt-6 pt-6 border-t border-charcoal/10">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeInDigest}
                onChange={(e) => setIncludeInDigest(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-charcoal/30 text-charcoal
                         focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm text-charcoal group-hover:text-charcoal/80 transition-colors block">
                  Include in weekly digest
                </span>
                <span className="text-xs text-charcoal-light/60 block mt-0.5">
                  Anonymous, no username
                </span>
              </div>
            </label>

            <button
              type="button"
              onClick={() => setShowDigestExplanation(true)}
              className="mt-2 text-xs text-charcoal-light hover:text-charcoal transition-colors
                       underline hover:no-underline"
            >
              What's this?
            </button>
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

      {/* Explanation modal */}
      {showDigestExplanation && (
        <DigestExplanation onClose={() => setShowDigestExplanation(false)} />
      )}
    </>
  )
}
