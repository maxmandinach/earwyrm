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
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
  )
}
