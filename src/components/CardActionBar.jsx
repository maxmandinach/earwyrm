import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useResonate from '../hooks/useResonate'
import OverflowMenu from './OverflowMenu'
import SavePopover from './SavePopover'
import ShareModal from './ShareModal'
import VisibilityToggle from './VisibilityToggle'

// Audio waveform — five vertical bars at different heights, like a sound pulse.
// Active state: bars are taller/bolder. Animation: bars bounce up in sequence.
function ResonateIcon({ active, animating }) {
  const bars = [
    { x: 4, rest: 6, active: 10, delay: 0 },
    { x: 8, rest: 10, active: 16, delay: 50 },
    { x: 12, rest: 14, active: 20, delay: 100 },
    { x: 16, rest: 10, active: 16, delay: 150 },
    { x: 20, rest: 6, active: 10, delay: 200 },
  ]

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {bars.map((bar, i) => {
        const h = active ? bar.active : bar.rest
        const y = 12 - h / 2
        return (
          <line
            key={i}
            x1={bar.x} y1={y}
            x2={bar.x} y2={y + h}
            stroke="currentColor"
            strokeWidth={active ? '2.5' : '2'}
            style={{
              transition: 'all 0.3s ease',
              ...(animating ? {
                animation: `waveform-bounce 0.5s ease-out ${bar.delay}ms`,
              } : {}),
            }}
          />
        )
      })}
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
  const navigate = useNavigate()
  const { hasReacted, count, animating, toggle } = useResonate(lyric.id, lyric.reaction_count || 0)
  const [showSave, setShowSave] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareNudge, setShareNudge] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [commentPop, setCommentPop] = useState(false)
  const [bookmarkSettle, setBookmarkSettle] = useState(false)

  function promptSignup() {
    navigate('/signup')
  }

  function handleShare() {
    setShareNudge(true)
    setTimeout(() => setShareNudge(false), 300)
    if (onShare) {
      onShare()
    } else {
      setShowShareModal(true)
    }
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
      {/* Keyframes for waveform bounce */}
      <style>{`
        @keyframes waveform-bounce {
          0% { transform: scaleY(0.3); }
          50% { transform: scaleY(1.3); }
          100% { transform: scaleY(1); }
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
            onClick={isAnon ? promptSignup : toggle}
            className={`flex items-center gap-1.5 text-xs transition-all duration-200 py-1 px-2 ${
              isAnon
                ? 'text-charcoal/30 hover:text-charcoal/50 cursor-pointer'
                : hasReacted
                  ? 'text-charcoal/70'
                  : 'text-charcoal/30 hover:text-charcoal/50'
            }`}
            style={{
              transform: animating ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.3s ease',
            }}
            title={isAnon ? 'Sign up to resonate' : hasReacted ? 'Remove resonance' : 'Resonate'}
          >
            <ResonateIcon active={hasReacted} animating={animating} />
            {count > 0 && <span>{count}</span>}
          </button>

          {/* Comment */}
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

          {/* Save (other's cards) / Visibility (own cards) */}
          {isOwn && !isAnon ? (
            <VisibilityToggle
              isPublic={isPublic}
              profileIsPublic={profileIsPublic}
              onChange={onVisibilityChange}
            />
          ) : (
            <div className="relative">
              <button
                onClick={isAnon ? promptSignup : handleSaveToggle}
                className="flex items-center gap-1.5 text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors py-1 px-2"
                title={isAnon ? 'Sign up to save' : 'Save'}
                style={{
                  transform: bookmarkSettle ? 'translateY(1px)' : 'translateY(0)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              {showSave && !isAnon && (
                <SavePopover lyricId={lyric.id} onClose={() => setShowSave(false)} />
              )}
            </div>
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
            {shareCopied ? (
              <span className="text-xs text-charcoal/50">copied</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
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
      {showShareModal && (
        <ShareModal
          lyric={lyric}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  )
}
