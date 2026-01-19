import { themes } from '../lib/themes'
import { formatRelativeTime } from '../lib/utils'

export default function LyricCard({ lyric, showTimestamp = true, className = '' }) {
  const theme = themes[lyric.theme] || themes.default

  const cardStyle = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
    lineHeight: theme.lineHeight,
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
  }

  const secondaryStyle = {
    color: theme.secondaryColor,
    fontFamily: theme.fontFamily,
  }

  return (
    <div
      className={`w-full max-w-lg mx-auto p-8 sm:p-12 ${className}`}
      style={cardStyle}
    >
      <blockquote className="mb-3">
        {lyric.content}
      </blockquote>

      {(lyric.song_title || lyric.artist_name) && (
        <p className="text-sm mt-2" style={secondaryStyle}>
          {lyric.song_title && <span>{lyric.song_title}</span>}
          {lyric.song_title && lyric.artist_name && <span> — </span>}
          {lyric.artist_name && <span>{lyric.artist_name}</span>}
        </p>
      )}

      {showTimestamp && lyric.created_at && (
        <p className="text-xs mt-4 opacity-60" style={secondaryStyle}>
          {formatRelativeTime(lyric.created_at)}
        </p>
      )}
    </div>
  )
}
