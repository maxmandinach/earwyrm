import { useState } from 'react'
import { themes } from '../lib/themes'

export default function DigestIntroModal({ lyric, onClose, onOptIn }) {
  const [includeInDigest, setIncludeInDigest] = useState(true)
  const [rememberChoice, setRememberChoice] = useState(true)

  const theme = themes[lyric.theme] || themes.default

  const handleSubmit = () => {
    onOptIn(includeInDigest, rememberChoice)
    onClose()
  }

  const handleMaybeLater = () => {
    onOptIn(false, false)
    onClose()
  }

  const previewCardStyle = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontWeight: theme.fontWeight,
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
  }

  const secondaryStyle = {
    color: theme.secondaryColor,
    fontFamily: theme.fontFamily,
  }

  return (
    <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-cream max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-charcoal/10 px-6 py-5">
          <h2 className="text-xl font-light text-charcoal tracking-tight">
            Introduce: Weekly Digest
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Explanation */}
          <div className="space-y-3">
            <p className="text-sm text-charcoal leading-relaxed">
              Every Sunday, we share a curated collection of lyrics from the past week—a quiet way to discover what's moving people.
            </p>
            <p className="text-sm text-charcoal-light leading-relaxed">
              Here's how yours would appear:
            </p>
          </div>

          {/* Preview Card */}
          <div className="border-2 border-charcoal/20 p-1">
            <div className="p-6" style={previewCardStyle}>
              <blockquote className="mb-3 text-base leading-relaxed">
                {lyric.content}
              </blockquote>

              {(lyric.song_title || lyric.artist_name) && (
                <p className="text-sm" style={secondaryStyle}>
                  {lyric.song_title && <span>{lyric.song_title}</span>}
                  {lyric.song_title && lyric.artist_name && <span> — </span>}
                  {lyric.artist_name && <span>{lyric.artist_name}</span>}
                </p>
              )}

              <p className="text-xs text-charcoal-light/50 mt-3">
                Shared 2 days ago
              </p>
            </div>
          </div>

          {/* Anonymous note */}
          <div className="bg-charcoal/5 px-4 py-3 border-l-2 border-charcoal/20">
            <p className="text-xs text-charcoal-light leading-relaxed">
              <strong className="text-charcoal">Anonymous.</strong> No username. No profile link. Just the lyric and the song.
            </p>
          </div>

          {/* Opt-in controls */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeInDigest}
                onChange={(e) => setIncludeInDigest(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-charcoal/30 text-charcoal
                         focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-charcoal group-hover:text-charcoal/80 transition-colors">
                Include this lyric in this week's digest
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-charcoal/30 text-charcoal
                         focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-charcoal-light group-hover:text-charcoal transition-colors">
                Remember my choice for future lyrics
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-charcoal/10 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleMaybeLater}
            className="px-4 py-2 text-sm text-charcoal-light hover:text-charcoal transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 text-sm font-medium text-charcoal border border-charcoal/30
                     hover:border-charcoal/60 transition-colors"
          >
            {includeInDigest ? 'Include It' : 'Keep Private'}
          </button>
        </div>
      </div>
    </div>
  )
}
