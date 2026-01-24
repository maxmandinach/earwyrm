import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signatureStyle } from '../lib/themes'
import { formatRelativeTime } from '../lib/utils'

export default function LyricCard({
  lyric,
  showTimestamp = true,
  className = '',
  isEditing = false,
  onSave,
  onCancel,
  linkable = false,
}) {
  const theme = signatureStyle

  // Local edit state
  const [content, setContent] = useState(lyric.content)
  const [songTitle, setSongTitle] = useState(lyric.song_title || '')
  const [artistName, setArtistName] = useState(lyric.artist_name || '')
  const [isSaving, setIsSaving] = useState(false)

  // Reset local state when lyric changes or editing starts
  useEffect(() => {
    setContent(lyric.content)
    setSongTitle(lyric.song_title || '')
    setArtistName(lyric.artist_name || '')
  }, [lyric.content, lyric.song_title, lyric.artist_name, isEditing])

  const handleSave = async () => {
    if (!content.trim() || isSaving) return
    setIsSaving(true)
    try {
      await onSave({
        content: content.trim(),
        songTitle: songTitle.trim() || null,
        artistName: artistName.trim() || null,
      })
    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setContent(lyric.content)
    setSongTitle(lyric.song_title || '')
    setArtistName(lyric.artist_name || '')
    onCancel?.()
  }

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
    textAlign: theme.textAlign,
    textShadow: theme.textShadow || 'none',
  }

  const secondaryStyle = {
    color: theme.secondaryColor,
    fontFamily: theme.fontFamily,
    textShadow: theme.textShadow || 'none',
  }

  return (
    <div
      className={`w-full max-w-lg mx-auto p-8 sm:p-12 ${className}`}
      style={cardStyle}
    >
      {isEditing ? (
        // Edit mode
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-transparent focus:outline-none resize-none mb-3"
            style={{
              fontFamily: theme.fontFamily,
              fontSize: theme.fontSize,
              fontWeight: theme.fontWeight,
              lineHeight: theme.lineHeight,
              color: theme.textColor,
            }}
            rows={4}
            autoFocus
          />

          <div className="space-y-2 mt-4 pt-4 border-t border-charcoal/10">
            <input
              type="text"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="Song title"
              className="w-full bg-transparent focus:outline-none placeholder:opacity-30 text-sm"
              style={secondaryStyle}
            />
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Artist"
              className="w-full bg-transparent focus:outline-none placeholder:opacity-30 text-sm"
              style={secondaryStyle}
            />
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-charcoal/10">
            <button
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
              className="text-sm font-medium transition-colors"
              style={{
                color: theme.textColor,
                opacity: !content.trim() ? 0.4 : 1,
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="text-sm transition-colors opacity-60 hover:opacity-100"
              style={{ color: theme.secondaryColor }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        // View mode
        <>
          <blockquote className="mb-3">
            {lyric.content}
          </blockquote>

          {(lyric.song_title || lyric.artist_name) && (
            <p className="text-sm mt-2" style={secondaryStyle}>
              {lyric.song_title && (
                linkable ? (
                  <Link
                    to={`/explore/song/${encodeURIComponent(lyric.song_title)}`}
                    className="hover:opacity-70 transition-opacity"
                  >
                    {lyric.song_title}
                  </Link>
                ) : (
                  <span>{lyric.song_title}</span>
                )
              )}
              {lyric.song_title && lyric.artist_name && <span> — </span>}
              {lyric.artist_name && (
                linkable ? (
                  <Link
                    to={`/explore/artist/${encodeURIComponent(lyric.artist_name)}`}
                    className="hover:opacity-70 transition-opacity"
                  >
                    {lyric.artist_name}
                  </Link>
                ) : (
                  <span>{lyric.artist_name}</span>
                )
              )}
            </p>
          )}

          {lyric.tags && lyric.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {lyric.tags.map((tag, index) => (
                linkable ? (
                  <Link
                    key={index}
                    to={`/explore/tag/${encodeURIComponent(tag)}`}
                    className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                    style={secondaryStyle}
                  >
                    #{tag}
                  </Link>
                ) : (
                  <span
                    key={index}
                    className="text-xs opacity-60"
                    style={secondaryStyle}
                  >
                    #{tag}
                  </span>
                )
              ))}
            </div>
          )}

          {showTimestamp && lyric.created_at && (
            <p className="text-xs mt-4 opacity-60" style={secondaryStyle}>
              {formatRelativeTime(lyric.created_at)}
            </p>
          )}
        </>
      )}
    </div>
  )
}
