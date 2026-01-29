import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

export default function ModalSheet({ onClose, title, maxWidth = 'max-w-lg', children }) {
  const overlayRef = useRef(null)
  const sheetRef = useRef(null)
  const firstFocusableRef = useRef(null)

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  // Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus trap
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab') return
    const sheet = sheetRef.current
    if (!sheet) return

    const focusable = sheet.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [])

  // Auto-focus first focusable on mount
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    const focusable = sheet.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length > 0) {
      focusable[0].focus()
    }
  }, [])

  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  const content = (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        ref={sheetRef}
        onKeyDown={handleKeyDown}
        className={`
          w-full ${maxWidth}
          max-h-[85vh] md:max-h-[90vh]
          flex flex-col
          overflow-hidden
          rounded-t-2xl md:rounded-lg
          animate-[slide-up_0.3s_ease-out] md:animate-none
        `}
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          color: 'var(--text-primary, #2C2825)',
          border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-charcoal/20" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 md:px-6 md:py-4 flex justify-between items-center border-b border-charcoal/10">
          <h2
            className="text-lg font-medium"
            style={{ color: 'var(--text-primary, #2C2825)' }}
          >
            {title || ''}
          </h2>
          <button
            onClick={onClose}
            className="py-2 px-3 text-sm transition-colors touch-target"
            style={{ color: 'var(--text-secondary, #6B635A)' }}
          >
            Cancel
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
