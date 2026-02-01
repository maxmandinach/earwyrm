import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import useResonate from '../hooks/useResonate'
import OverflowMenu from './OverflowMenu'
import SavePopover from './SavePopover'
import VisibilityToggle from './VisibilityToggle'

// Concentric arcs radiating from a center point — "resonance spreading"
// Oriented upward (not sideways like wifi). Three arcs + center dot.
function ResonateIcon({ active, animating }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {/* Center dot */}
      <circle cx="12" cy="20" r="1.5" fill="currentColor" stroke="none" />
      {/* Inner arc */}
      <path
        d="M8.5 16a5 5 0 0 1 7 0"
        strokeWidth={active ? '2.5' : '2'}
        style={{
          opacity: active ? 1 : 0.8,
          transition: 'all 0.3s ease',
          ...(animating ? {
            animation: 'resonate-ripple 0.6s ease-out',
            animationDelay: '0ms',
          } : {}),
        }}
      />
      {/* Middle arc */}
      <path
        d="M5.5 12.5a9 9 0 0 1 13 0"
        strokeWidth={active ? '2' : '1.75'}
        style={{
          opacity: active ? 0.7 : 0.5,
          transition: 'all 0.3s ease',
          ...(animating ? {
            animation: 'resonate-ripple 0.6s ease-out',
            animationDelay: '100ms',
          } : {}),
        }}
      />
      {/* Outer arc */}
      <path
        d="M2.5 9a14 14 0 0 1 19 0"
        strokeWidth={active ? '1.75' : '1.5'}
        style={{
          opacity: active ? 0.45 : 0.25,
          transition: 'all 0.3s ease',
          ...(animating ? {
            animation: 'resonate-ripple 0.6s ease-out',
            animationDelay: '200ms',
          } : {}),
        }}
      />
    </svg>
  )
}

export default function CardActionBar({
  lyric,
  isOwn = false,
  isAnon = false,
  commentCount = 0,
  isPublic,
  profileIsPublic,
  onShare,
  onVisibilityChange,
  onEdit,
  onReplace,
  onToggleComments,
  username,
}) {
  const { hasReacted, count, animating, toggle } = useResonate(lyric.id, lyric.reaction_count || 0)
  const [showSave, setShowSave] = useState(false)
  const [shareNudge, setShareNudge] = useState(false)
  const [commentPop, setCommentPop] = useState(false)
  const [bookmarkSettle, setBookmarkSettle] = useState(false)

  function handleShare() {
    setShareNudge(true)
    setTimeout(() => setShareNudge(false), 300)
    onShare?.()
  }

  function handleToggleComments() {
    setCommentPop(true)
    setTimeout(() => setCommentPop(false), 300)
    onToggleComments?.()
  }

  function handleSaveToggle() {
    if (!showSave) {
      setBookmarkSettle(true)
      setTimeout(() => setBookmarkSettle(false), 300)
    }
    setShowSave(!showSave)
  }

  return (
    <>
      {/* Keyframes for resonate ripple */}
      <style>{`
        @keyframes resonate-ripple {
          0% { opacity: 0; transform: translateY(3px); }
          50% { opacity: 1; }
          100% { opacity: inherit; transform: translateY(0); }
        }
      `}</style>

      <div
        className="flex items-center gap-1 pt-3 mt-3"
        style={{ borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
      >
        {/* Left group */}
        <div className="flex items-center gap-1 flex-1">
          {/* Resonate */}
          <button
            onClick={!isAnon ? toggle : undefined}
            className={`flex items-center gap-1.5 text-xs transition-all duration-200 py-1 px-2 ${
              isAnon
                ? 'text-charcoal/30 cursor-default'
                : hasReacted
                  ? 'text-charcoal/70'
                  : 'text-charcoal/30 hover:text-charcoal/50'
            }`}
            style={{
              transform: animating ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.3s ease',
            }}
            title={isAnon ? 'Sign in to resonate' : hasReacted ? 'Remove resonance' : 'Resonate'}
          >
            <ResonateIcon active={hasReacted} animating={animating} />
            {count > 0 && <span>{count}</span>}
          </button>

          {/* Comment */}
          {!isAnon && (
            <button
              onClick={handleToggleComments}
              className="flex items-center gap-1.5 text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors py-1 px-2"
              title="Thoughts"
              style={{
                transform: commentPop ? 'scale(1.12)' : 'scale(1)',
                transition: 'transform 0.2s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  opacity: commentPop ? 0.7 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {commentCount > 0 && <span>{commentCount}</span>}
            </button>
          )}

          {/* Save (other's cards) / Visibility (own cards) */}
          {!isAnon && (
            isOwn ? (
              <VisibilityToggle
                isPublic={isPublic}
                profileIsPublic={profileIsPublic}
                onChange={onVisibilityChange}
              />
            ) : (
              <div className="relative">
                <button
                  onClick={handleSaveToggle}
                  className="flex items-center gap-1.5 text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors py-1 px-2"
                  title="Save"
                  style={{
                    transform: bookmarkSettle ? 'translateY(1px)' : 'translateY(0)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
                {showSave && (
                  <SavePopover lyricId={lyric.id} onClose={() => setShowSave(false)} />
                )}
              </div>
            )
          )}
        </div>

        {/* Right group */}
        <div className="flex items-center gap-1">
          {/* Share */}
          <button
            onClick={handleShare}
            className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors py-1 px-2"
            title="Share"
            style={{
              transform: shareNudge ? 'translateY(-2px)' : 'translateY(0)',
              transition: 'transform 0.2s ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>

          {/* Overflow */}
          {!isAnon && (
            <OverflowMenu
              isOwn={isOwn}
              lyric={lyric}
              username={username}
              profileIsPublic={profileIsPublic}
              onEdit={onEdit}
              onReplace={onReplace}
            />
          )}
        </div>
      </div>
    </>
  )
}
