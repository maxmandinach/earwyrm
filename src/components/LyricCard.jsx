import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signatureStyle } from '../lib/themes'
import { formatRelativeTime } from '../lib/utils'
import CardActionBar from './CardActionBar'
import NoteEditor from './NoteEditor'
import NotePeek from './NotePeek'
import CommentSection from './CommentSection'
import SignupOverlay from './SignupOverlay'
import useRevealOnScroll from '../hooks/useRevealOnScroll'

export default function LyricCard({
  lyric,
  showTimestamp = true,
  className = '',
  isEditing = false,
  onSave,
  onCancel,
  linkable = false,
  // Action bar props
  showActions = false,
  isOwn = false,
  isAnon = false,
  onShare,
  onVisibilityChange,
  onEdit,
  onReplace,
  isPublic,
  profileIsPublic,
  username,
  // Notes props
  notes,
  initialNote,
  onNoteChange,
  // Animation
  skipReveal = false,
  // Visual variant
  hero = false,
  compact = false,
  // Notification click-through
  initialShowComments = false,
  highlightRef = null,
  highlightCommentId = null,
}) {
  const theme = signatureStyle
  const { ref: revealRef, revealed } = useRevealOnScroll()
  const shouldAnimate = !skipReveal && !compact && showActions
  const isVisible = skipReveal || compact || !showActions || revealed

  // Local edit state
  const [content, setContent] = useState(lyric.content)
  const [songTitle, setSongTitle] = useState(lyric.song_title || '')
  const [artistName, setArtistName] = useState(lyric.artist_name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [showComments, setShowComments] = useState(initialShowComments)
  const [showSignup, setShowSignup] = useState(false)
  const [highlighted, setHighlighted] = useState(!!highlightRef)
  const [localCommentCount, setLocalCommentCount] = useState(lyric.comment_count || 0)

  // Remove highlight class after animation completes
  useEffect(() => {
    if (highlightRef) {
      const timer = setTimeout(() => setHighlighted(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightRef])

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
      // Trigger settle animation
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 400)
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

  const secondaryStyle = {
    color: 'var(--text-secondary, #6B635A)',
  }

  // Card styling - clean surface with depth
  const cardStyle = {
    backgroundColor: 'var(--surface-card, #F5F2ED)',
    color: 'var(--text-primary, #2C2825)',
    fontFamily: theme.fontFamily,
    fontSize: compact ? '1.35rem' : hero ? 'clamp(1.4rem, 4vw, 1.8rem)' : theme.fontSize,
    fontWeight: theme.fontWeight,
    lineHeight: compact ? '1.4' : hero ? '1.7' : theme.lineHeight,
    fontStyle: theme.fontStyle,
    letterSpacing: hero ? '0.01em' : theme.letterSpacing,
    textAlign: theme.textAlign,
    boxShadow: compact
      ? 'var(--shadow-card, 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06))'
      : hero
        ? '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.1)'
        : 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08))',
    border: hero ? 'none' : '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
  }

  return (
    <div
      ref={revealRef}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'translateY(0) rotate(0deg)'
          : 'translateY(18px) rotate(-0.3deg)',
        transition: shouldAnimate
          ? 'opacity 0.7s ease-out, transform 0.7s ease-out'
          : 'none',
      }}
    >
      <div
        className={`w-full max-w-lg mx-auto relative ${compact ? 'p-4 sm:p-5' : hero ? 'p-7 sm:p-10 md:p-14' : 'p-5 sm:p-8 md:p-10'} ${highlighted ? 'notification-highlight' : ''} ${className}`}
        style={{
          ...cardStyle,
          overflow: 'visible',
          ...(justSaved ? { transform: 'scale(1.01)', transition: 'transform 0.3s ease' } : {}),
        }}
      >
        {isEditing ? (
          // Edit mode
          <>
            <textarea
              value={content}
              onChange={(e) => { if (!isSaving) setContent(e.target.value.slice(0, 500)) }}
              maxLength={500}
              className="w-full bg-transparent focus:outline-none resize-none mb-3"
              style={{
                fontFamily: theme.fontFamily,
                fontSize: theme.fontSize,
                fontWeight: theme.fontWeight,
                lineHeight: theme.lineHeight,
                color: 'var(--text-primary, #2C2825)',
              }}
              rows={4}
              autoFocus
            />
            {content.length > 400 && (
              <p className="text-xs text-charcoal/30 text-right -mt-2 mb-2">{content.length}/500</p>
            )}

            <div className="space-y-2 mt-4 pt-4 border-t border-charcoal/10">
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Song title"
                className="w-full bg-transparent focus:outline-none placeholder:opacity-50"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: '0.875rem',
                  fontStyle: 'italic',
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
                  fontSize: '0.875rem',
                  fontStyle: 'italic',
                  color: 'var(--text-secondary, #6B635A)',
                }}
              />
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-charcoal/10">
              <button
                onClick={handleSave}
                disabled={!content.trim() || isSaving}
                className="text-sm font-medium transition-all duration-200"
                style={{
                  color: 'var(--text-primary, #2C2825)',
                  opacity: !content.trim() ? 0.4 : 1,
                  transform: isSaving ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="text-sm transition-colors opacity-60 hover:opacity-100"
                style={{ color: 'var(--text-secondary, #6B635A)' }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          // View mode
          <>
            <blockquote className={`leading-relaxed ${compact ? 'mb-3 line-clamp-3' : 'mb-4'}`}>
              {lyric.content}
            </blockquote>

            {(lyric.song_title || lyric.artist_name) && (
              <>
                {/* Signature element: thin rule - matches share card */}
                <div
                  className={compact ? 'w-12 mt-3 mb-2' : 'w-20 mt-5 mb-4'}
                  style={{
                    height: '1.5px',
                    backgroundColor: 'var(--color-accent, #B8A99A)',
                    opacity: 0.5
                  }}
                />
                <div className="flex items-center gap-3">
                  {/* Cover art thumbnail — hidden in compact */}
                  {!compact && lyric.cover_art_url && (
                    <div
                      className={`${hero ? 'w-14 h-14' : 'w-10 h-10'} flex-shrink-0 rounded`}
                      style={{
                        backgroundImage: `url(${lyric.cover_art_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                    />
                  )}
                  <p
                    style={{
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      fontSize: compact ? '0.8rem' : '0.875rem',
                      fontStyle: 'italic',
                      color: 'var(--text-secondary, #6B635A)',
                    }}
                  >
                    {lyric.song_title && (
                      linkable ? (
                        <Link
                          to={`/song/${encodeURIComponent(lyric.song_title.toLowerCase())}${lyric.artist_name ? `?artist=${encodeURIComponent(lyric.artist_name)}` : ''}`}
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
                          to={`/artist/${encodeURIComponent(lyric.artist_name.toLowerCase())}`}
                          className="hover:opacity-70 transition-opacity"
                        >
                          {lyric.artist_name}
                        </Link>
                      ) : (
                        <span>{lyric.artist_name}</span>
                      )
                    )}
                  </p>
                </div>
              </>
            )}

            {/* Tags — hidden in compact */}
            {!compact && lyric.tags && lyric.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {lyric.tags.map((tag, index) => (
                  linkable ? (
                    <Link
                      key={index}
                      to={`/explore/tag/${encodeURIComponent(tag)}`}
                      className="text-xs opacity-50 hover:opacity-80 transition-opacity"
                      style={secondaryStyle}
                    >
                      #{tag}
                    </Link>
                  ) : (
                    <span
                      key={index}
                      className="text-xs opacity-50"
                      style={secondaryStyle}
                    >
                      #{tag}
                    </span>
                  )
                ))}
              </div>
            )}

            {/* Poster's note — hidden in compact */}
            {!compact && isOwn && showActions && !isEditing && initialNote?.content && (
              <div className="mt-5">
                <NoteEditor
                  lyricId={lyric.id}
                  initialNote={initialNote}
                  onNoteChange={onNoteChange}
                  showVisibilityToggle
                />
              </div>
            )}

            {/* Compact: inline counts row */}
            {compact && (
              <div
                className="flex items-center gap-4 mt-3 pt-2"
                style={{ borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
              >
                {(lyric.reaction_count || 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-charcoal/30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                      {[
                        { x: 4, h: 6 },
                        { x: 8, h: 10 },
                        { x: 12, h: 14 },
                        { x: 16, h: 10 },
                        { x: 20, h: 6 },
                      ].map((bar, i) => (
                        <line key={i} x1={bar.x} y1={12 - bar.h / 2} x2={bar.x} y2={12 + bar.h / 2}
                          stroke="currentColor" strokeWidth="2" />
                      ))}
                    </svg>
                    {lyric.reaction_count}
                  </span>
                )}
                {(lyric.comment_count || 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-charcoal/30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    {lyric.comment_count}
                  </span>
                )}
                {showTimestamp && lyric.created_at && (
                  <span
                    className="text-xs opacity-40 ml-auto"
                    style={{
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      color: 'var(--text-muted, #9C948A)',
                    }}
                  >
                    {formatRelativeTime(lyric.created_at)}
                  </span>
                )}
              </div>
            )}

            {/* Full timestamp — non-compact only */}
            {!compact && showTimestamp && lyric.created_at && (
              <p
                className="text-xs mt-5 opacity-40"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  color: 'var(--text-muted, #9C948A)',
                }}
              >
                {formatRelativeTime(lyric.created_at)}
              </p>
            )}

            {/* Action bar — non-compact only */}
            {!compact && showActions && !isEditing && (
              <CardActionBar
                lyric={lyric}
                isOwn={isOwn}
                isAnon={isAnon}
                commentCount={localCommentCount}
                isPublic={isPublic}
                profileIsPublic={profileIsPublic}
                onShare={onShare}
                onVisibilityChange={onVisibilityChange}
                onEdit={onEdit}
                onReplace={onReplace}
                onToggleComments={() => setShowComments(!showComments)}
                username={username}
                highlightRef={highlightRef}
              />
            )}
          </>
        )}
      </div>

      {/* Other people's public notes - below the card (hidden in compact) */}
      {!compact && showActions && !isEditing && !isOwn && notes && notes.length > 0 && (
        <NotePeek
          notes={notes}
        />
      )}

      {/* Comment section - after notes (hidden in compact) */}
      {!compact && showActions && showComments && !isEditing && (
        <div className="w-full max-w-lg mx-auto mt-2">
          <CommentSection
            lyricId={lyric.id}
            initialCount={localCommentCount}
            onSignupPrompt={isAnon ? () => setShowSignup(true) : undefined}
            highlightCommentId={highlightCommentId}
            onCountChange={(delta) => setLocalCommentCount(prev => Math.max(0, prev + delta))}
          />
        </div>
      )}
      {showSignup && (
        <SignupOverlay intent="comment" onClose={() => setShowSignup(false)} />
      )}
    </div>
  )
}
