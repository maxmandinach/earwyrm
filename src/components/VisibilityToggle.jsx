import { useState } from 'react'

function ConfirmPublicModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/20">
      <div className="bg-cream w-full max-w-md p-6">
        <h3 className="text-lg font-medium text-charcoal mb-4">Make lyric public?</h3>
        <p className="text-sm text-charcoal-light mb-6">
          Anyone with the link to your profile will be able to see this lyric. You can change this back to private at any time.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-sm text-charcoal-light hover:text-charcoal
                       border border-charcoal/20 hover:border-charcoal/40
                       transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 text-sm font-medium text-cream bg-charcoal
                       hover:bg-charcoal/80 transition-colors"
          >
            Make Public
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VisibilityToggle({ isPublic, onChange, disabled = false }) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleToggle = () => {
    if (!isPublic) {
      // Going from private to public - show confirmation
      setShowConfirm(true)
    } else {
      // Going from public to private - no confirmation needed
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
        className="flex items-center gap-2 text-sm group disabled:opacity-50 disabled:cursor-not-allowed"
        title={isPublic ? "Currently visible to others - click to make private" : "Currently private - click to make public"}
      >
        <div className={`relative w-11 h-6 rounded-full transition-colors ${
          isPublic ? 'bg-charcoal' : 'bg-charcoal/20'
        }`}>
          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-cream transition-transform ${
            isPublic ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </div>
        <span className="text-charcoal-light group-hover:text-charcoal transition-colors">
          {isPublic ? 'Public' : 'Private'}
        </span>
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
