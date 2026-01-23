import { themes } from '../lib/themes'
import { layouts } from '../lib/layouts'
import { formatRelativeTime } from '../lib/utils'

export default function LyricCard({ lyric, showTimestamp = true, className = '' }) {
  const theme = themes[lyric.theme] || themes.default
  const layout = layouts[lyric.layout] || layouts.standard
  const config = layout.canvas

  // Base card style from theme
  const cardStyle = {
    backgroundColor: theme.backgroundColor,
    backgroundImage: theme.backgroundGradient || 'none',
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
    lineHeight: theme.lineHeight,
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: config.lyricAlign,
    textShadow: theme.textShadow || 'none',
  }

  const secondaryStyle = {
    color: theme.secondaryColor,
    fontFamily: theme.fontFamily,
    textShadow: theme.textShadow || 'none',
  }

  // Layout-specific container classes
  const getContainerClass = () => {
    switch (lyric.layout) {
      case 'editorial':
        return 'flex flex-col justify-end min-h-[280px] relative'
      case 'brutalist':
        return 'flex flex-col items-center justify-center min-h-[280px]'
      case 'cinematic':
        return 'flex flex-col justify-end min-h-[280px] pb-4'
      default:
        return 'flex flex-col items-center justify-center'
    }
  }

  // Layout-specific lyric classes
  const getLyricClass = () => {
    switch (lyric.layout) {
      case 'editorial':
        return 'mb-3 max-w-[70%]'
      case 'brutalist':
        return 'mb-3 text-2xl sm:text-3xl font-bold uppercase tracking-tight text-center'
      case 'cinematic':
        return 'mb-3 text-center'
      default:
        return 'mb-3'
    }
  }

  // Layout-specific attribution classes
  const getAttributionClass = () => {
    switch (lyric.layout) {
      case 'editorial':
        return 'text-xs absolute right-4 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl]'
      case 'brutalist':
        return 'text-xs uppercase tracking-widest opacity-50 text-center'
      default:
        return 'text-sm mt-2'
    }
  }

  // Get display content
  const displayContent = config.lyricTransform === 'uppercase'
    ? lyric.content.toUpperCase()
    : lyric.content

  // Get attribution text
  let attributionText = ''
  if (lyric.song_title) attributionText += lyric.song_title
  if (lyric.song_title && lyric.artist_name) attributionText += ' — '
  if (lyric.artist_name) attributionText += lyric.artist_name
  if (config.attributionTransform === 'uppercase') {
    attributionText = attributionText.toUpperCase()
  }

  return (
    <div
      className={`w-full max-w-lg mx-auto p-8 sm:p-12 ${getContainerClass()} ${className}`}
      style={cardStyle}
    >
      {/* Letterbox effect for cinematic */}
      {layout.id === 'cinematic' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[12%] bg-black" />
          <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-black" />
        </>
      )}

      <blockquote className={getLyricClass()}>
        {displayContent}
      </blockquote>

      {attributionText && (
        <p className={getAttributionClass()} style={secondaryStyle}>
          {attributionText}
        </p>
      )}

      {lyric.tags && lyric.tags.length > 0 && layout.id !== 'editorial' && layout.id !== 'brutalist' && (
        <div className={`flex flex-wrap gap-2 mt-3 ${config.lyricAlign === 'center' ? 'justify-center' : ''}`}>
          {lyric.tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs opacity-60"
              style={secondaryStyle}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {showTimestamp && lyric.created_at && layout.id !== 'editorial' && layout.id !== 'brutalist' && (
        <p className={`text-xs mt-4 opacity-60 ${config.lyricAlign === 'center' ? 'text-center' : ''}`} style={secondaryStyle}>
          {formatRelativeTime(lyric.created_at)}
        </p>
      )}
    </div>
  )
}
