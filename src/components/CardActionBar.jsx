import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import useResonate from '../hooks/useResonate'
import OverflowMenu from './OverflowMenu'
import SavePopover from './SavePopover'
import VisibilityToggle from './VisibilityToggle'

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

  return (
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
          style={{ transform: animating ? 'scale(1.15)' : 'scale(1)' }}
          title={isAnon ? 'Sign in to resonate' : hasReacted ? 'Remove resonance' : 'Resonate'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={hasReacted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12c2-3 5-5 10-5s8 2 10 5" />
            <path d="M5 12c1.5-2 3.5-3 7-3s5.5 1 7 3" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
          {count > 0 && <span>{count}</span>}
        </button>

        {/* Comment */}
        {!isAnon && (
          <button
            onClick={onToggleComments}
            className="flex items-center gap-1.5 text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors py-1 px-2"
            title="Thoughts"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
                onClick={() => setShowSave(!showSave)}
                className="flex items-center gap-1.5 text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors py-1 px-2"
                title="Save"
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
          onClick={onShare}
          className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors py-1 px-2"
          title="Share"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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
  )
}
