import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useResonate from '../hooks/useResonate'
import CompactCommentModal from './CompactCommentModal'
import SavePopover from './SavePopover'

/**
 * Compact lyric card for horizontal carousels.
 * Shows lyric snippet, song/artist, username, resonate + comments + save + share.
 */
function CompactCard({ lyric }) {
  const { user } = useAuth()
  const { hasReacted, count, animating, toggle } = useResonate(lyric.id, lyric.reaction_count || 0)
  const [shareCopied, setShareCopied] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [commentCount, setCommentCount] = useState(lyric.comment_count || 0)
  const isAnon = !user

  const linkTo = lyric.share_token
    ? `/l/${lyric.share_token}`
    : `/song/${encodeURIComponent((lyric.song_title || '').toLowerCase())}`

  function handleShare(e) {
    e.preventDefault()
    e.stopPropagation()
    if (lyric.share_token) {
      const url = `${window.location.origin}/l/${lyric.share_token}`
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }).catch(() => {})
    }
  }

  function handleResonate(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!isAnon) toggle()
  }

  function handleCommentClick(e) {
    e.preventDefault()
    e.stopPropagation()
    setShowComments(true)
  }

  function handleSaveClick(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!isAnon) setShowSave(true)
  }

  const username = lyric.profiles?.username

  return (
    <div className="flex-shrink-0 w-[260px] sm:w-[280px]">
      <Link
        to={linkTo}
        className="block p-5 h-full"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.06)',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        }}
      >
        {/* Username */}
        {username && (
          <p className="text-xs text-charcoal/30 mb-2 truncate">@{username}</p>
        )}

        {/* Lyric snippet — 3 lines max */}
        <p
          className="text-charcoal/80 leading-relaxed mb-3 line-clamp-3"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '1.1rem' }}
        >
          {lyric.content}
        </p>

        {/* Attribution */}
        {(lyric.song_title || lyric.artist_name) && (
          <p className="text-xs text-charcoal/40 italic truncate">
            {lyric.song_title}
            {lyric.song_title && lyric.artist_name && ' — '}
            {lyric.artist_name}
          </p>
        )}

        {/* Compact action row */}
        <div
          className="flex items-center gap-1 mt-3 pt-2"
          style={{ borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
        >
          {/* Resonate */}
          <button
            onClick={handleResonate}
            className={`flex items-center gap-1 text-xs py-1 px-1.5 transition-all duration-200 ${
              isAnon
                ? 'text-charcoal/25 cursor-default'
                : hasReacted
                  ? 'text-charcoal/60'
                  : 'text-charcoal/25 hover:text-charcoal/40'
            }`}
            style={{
              transform: animating ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.3s ease',
            }}
            title={isAnon ? 'Sign in to resonate' : hasReacted ? 'Remove resonance' : 'Resonate'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
              {[
                { x: 4, h: hasReacted ? 10 : 6 },
                { x: 8, h: hasReacted ? 16 : 10 },
                { x: 12, h: hasReacted ? 20 : 14 },
                { x: 16, h: hasReacted ? 16 : 10 },
                { x: 20, h: hasReacted ? 10 : 6 },
              ].map((bar, i) => (
                <line
                  key={i}
                  x1={bar.x} y1={12 - bar.h / 2}
                  x2={bar.x} y2={12 + bar.h / 2}
                  stroke="currentColor"
                  strokeWidth={hasReacted ? '2.5' : '2'}
                  style={{ transition: 'all 0.3s ease' }}
                />
              ))}
            </svg>
            {count > 0 && <span>{count}</span>}
          </button>

          {/* Comment */}
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1 text-xs text-charcoal/25 hover:text-charcoal/40 transition-colors py-1 px-1.5"
            title="Comments"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>

          {/* Save / Bookmark */}
          <button
            onClick={handleSaveClick}
            className={`text-xs py-1 px-1.5 transition-colors ${
              isAnon ? 'text-charcoal/25 cursor-default' : 'text-charcoal/25 hover:text-charcoal/40'
            }`}
            title={isAnon ? 'Sign in to save' : 'Save to collection'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* Share */}
          <button
            onClick={handleShare}
            className="text-xs text-charcoal/25 hover:text-charcoal/40 transition-colors py-1 px-1.5"
            title="Share"
          >
            {shareCopied ? (
              <span className="text-xs text-charcoal/40">copied</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
          </button>
        </div>
      </Link>

      {/* Portal-based modals */}
      {showComments && (
        <CompactCommentModal
          lyricId={lyric.id}
          shareToken={lyric.share_token}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => setCommentCount(c => c + 1)}
        />
      )}
      {showSave && (
        <SavePopover
          lyricId={lyric.id}
          onClose={() => setShowSave(false)}
          portal
        />
      )}
    </div>
  )
}

/**
 * Horizontal scrolling carousel of compact lyric cards.
 * Props: title, lyrics[], linkTo (optional "see all" URL), linkLabel
 */
export default function HorizontalCardCarousel({ title, lyrics, linkTo, linkLabel = 'See all →' }) {
  if (!lyrics || lyrics.length === 0) return null

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors">
            {linkLabel}
          </Link>
        )}
      </div>

      {/* Horizontal scroll — bleeds past container edges on mobile */}
      <div
        className="-mx-4 px-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {lyrics.map((lyric) => (
          <div key={lyric.id} style={{ scrollSnapAlign: 'start' }}>
            <CompactCard lyric={lyric} />
          </div>
        ))}
      </div>
    </div>
  )
}
