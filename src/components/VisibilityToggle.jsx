import { useState } from 'react'
import { Link } from 'react-router-dom'
import ModalSheet from './ModalSheet'

function ConfirmPublicModal({ onConfirm, onCancel }) {
  return (
    <ModalSheet onClose={onCancel} title="Make this lyric public?" maxWidth="max-w-sm">
      <div className="p-5 sm:p-6">
        <p className="text-sm text-charcoal-light mb-4">
          This will share your lyric (and note, if you have one) to:
        </p>
        <ul className="text-sm text-charcoal-light mb-6 space-y-1 ml-4">
          <li>• <strong>Explore</strong> — others can discover it</li>
          <li>• <strong>Your profile</strong> — visible at your @username</li>
        </ul>
        <p className="text-xs text-charcoal-light/60 mb-6">
          Want all your lyrics to be public by default?{' '}
          <Link to="/settings" className="underline hover:text-charcoal">
            Change in Settings
          </Link>
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-sm text-charcoal-light hover:text-charcoal
                       border border-charcoal/20 hover:border-charcoal/40
                       transition-colors"
          >
            Keep private
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 text-sm font-medium text-cream bg-charcoal
                       hover:bg-charcoal/80 transition-colors"
          >
            Make public
          </button>
        </div>
      </div>
    </ModalSheet>
  )
}

export default function VisibilityToggle({ isPublic, profileIsPublic, onChange, disabled = false }) {
  const [showConfirm, setShowConfirm] = useState(false)

  // If profile is public, show static indicator
  if (profileIsPublic) {
    return (
      <Link
        to="/settings"
        className="flex items-center gap-1.5 text-sm text-charcoal-light hover:text-charcoal transition-colors"
        title="Your profile is public. Change in Settings."
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>public</span>
      </Link>
    )
  }

  // Profile is private - show toggle for this lyric
  const handleToggle = () => {
    if (!isPublic) {
      setShowConfirm(true)
    } else {
      onChange(false)
    }
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    onChange(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="flex items-center gap-1.5 text-sm text-charcoal-light hover:text-charcoal
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={isPublic ? 'On Explore + your profile' : 'Only visible via share link'}
      >
        {isPublic ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
        <span>{isPublic ? 'public' : 'private'}</span>
      </button>

      {showConfirm && (
        <ConfirmPublicModal
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
