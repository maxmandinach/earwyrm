import { useRef, useEffect } from 'react'

export default function ExploreSearchInput({ value, onChange, onClear, placeholder = 'Search...', className = '', autoFocus = false }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  return (
    <div className={`relative ${className}`}>
      {/* Magnifying glass icon */}
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30 pointer-events-none"
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full bg-charcoal/5 border border-charcoal/8
                   pl-9 pr-9 py-2.5 text-sm text-charcoal
                   focus:outline-none focus:border-charcoal/20
                   placeholder:text-charcoal/30"
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={() => onClear ? onClear() : onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal/60"
        >
          ✕
        </button>
      )}
    </div>
  )
}
