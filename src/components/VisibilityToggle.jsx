import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

function ConfirmPublicModal({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '28rem',
          padding: '1.5rem',
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
          borderRadius: '4px',
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-charcoal">Make this lyric public?</h3>
          <button
            onClick={onCancel}
            className="text-charcoal/40 hover:text-charcoal/60 transition-colors p-1 -mr-1 -mt-1"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
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
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
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
    </div>
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

      {showConfirm && createPortal(
        <ConfirmPublicModal
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />,
        document.body
      )}
    </>
  )
}
