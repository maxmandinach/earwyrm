import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'

const REASONS = [
  'Spam',
  'Harassment',
  'Inappropriate content',
  'Other',
]

export default function ReportModal({ contentType, contentId, onClose }) {
  const { user } = useAuth()
  const [selectedReason, setSelectedReason] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!selectedReason || !user || isSubmitting) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: user.id,
          content_type: contentType,
          content_id: contentId,
          reason: selectedReason,
        })

      if (error) {
        // Duplicate report — treat as success
        if (error.code === '23505') {
          setSubmitted(true)
          setTimeout(onClose, 1000)
          return
        }
        throw error
      }

      setSubmitted(true)
      setTimeout(onClose, 1000)
    } catch (err) {
      console.error('Report error:', err)
      setIsSubmitting(false)
    }
  }

  const content = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="w-full max-w-sm max-h-[85vh] overflow-auto rounded-t-2xl md:rounded-lg p-6"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          color: 'var(--text-primary, #2C2825)',
          border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-50">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
          <h3
            className="text-lg font-medium"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Report {contentType}
          </h3>
          <p className="text-sm opacity-50 mt-1">Why are you reporting this?</p>
        </div>

        {/* Reasons */}
        <div className="space-y-2 mb-6">
          {REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors"
              style={{
                backgroundColor: selectedReason === reason
                  ? 'rgba(184, 169, 154, 0.12)'
                  : 'var(--surface-elevated, #F5F0E8)',
                borderRadius: '10px',
                border: selectedReason === reason
                  ? '1px solid var(--color-accent, #B8A99A)'
                  : '1px solid transparent',
              }}
            >
              <span>{reason}</span>
              {selectedReason === reason ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-accent, #B8A99A)" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="8 12 11 15 16 9" />
                </svg>
              ) : (
                <div
                  className="w-[18px] h-[18px] rounded-full"
                  style={{ border: '1.5px solid var(--text-muted, #9C948A)', opacity: 0.3 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        {submitted ? (
          <div className="flex items-center justify-center gap-2 py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-sm font-medium">Report submitted</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-sm transition-colors"
              style={{ color: 'var(--text-secondary, #6B635A)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className="flex-1 py-3 text-sm font-medium text-white transition-all"
              style={{
                backgroundColor: selectedReason ? '#D4756A' : 'var(--text-muted, #9C948A)',
                opacity: selectedReason ? 1 : 0.3,
                borderRadius: '12px',
                cursor: selectedReason ? 'pointer' : 'not-allowed',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
