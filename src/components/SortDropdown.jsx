import { useState, useEffect, useRef } from 'react'

const SORT_OPTIONS = [
  { key: 'newest', label: 'newest' },
  { key: 'resonated', label: 'most resonated' },
  { key: 'discussed', label: 'most discussed' },
]

export default function SortDropdown({ sortBy, setSortBy }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const currentLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label || 'newest'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors"
      >
        {/* Sort lines icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="14" y2="12" />
          <line x1="4" y1="18" x2="8" y2="18" />
        </svg>
        {currentLabel}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-elevated, #FAF8F5)',
            border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          }}
        >
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setSortBy(key); setIsOpen(false) }}
              className={`block w-full text-left px-4 py-2.5 text-xs transition-colors ${
                sortBy === key
                  ? 'text-charcoal/70 bg-charcoal/5'
                  : 'text-charcoal/40 hover:bg-charcoal/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
