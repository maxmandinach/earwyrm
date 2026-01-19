import { useState, useRef, useEffect } from 'react'

export default function TagInput({ value = [], onChange, suggestions = [] }) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = suggestions
    .filter(tag =>
      tag.toLowerCase().includes(inputValue.toLowerCase().trim()) &&
      !value.map(t => t.toLowerCase()).includes(tag.toLowerCase())
    )
    .slice(0, 5) // Limit to 5 suggestions

  // Add a tag
  const addTag = (tag) => {
    const trimmed = tag.trim()
    if (!trimmed) return

    // Check if tag already exists (case-insensitive)
    const exists = value.some(t => t.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setInputValue('')
      return
    }

    onChange([...value, trimmed])
    setInputValue('')
    setShowSuggestions(false)
  }

  // Remove a tag
  const removeTag = (indexToRemove) => {
    onChange(value.filter((_, index) => index !== indexToRemove))
  }

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(newValue.trim().length > 0)
    setSelectedIndex(0)
  }

  // Handle keyboard events
  const handleKeyDown = (e) => {
    // Enter or comma: add tag
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (filteredSuggestions.length > 0 && showSuggestions) {
        addTag(filteredSuggestions[selectedIndex])
      } else {
        addTag(inputValue)
      }
      return
    }

    // Backspace on empty input: remove last tag
    if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value.length - 1)
      return
    }

    // Arrow keys: navigate suggestions
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      }
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={inputRef}>
      {/* Tag chips display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-charcoal/10 text-charcoal rounded-full"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:text-charcoal/60 transition-colors"
                aria-label={`Remove ${tag} tag`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="3" x2="11" y2="11" />
                  <line x1="11" y1="3" x2="3" y2="11" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input field */}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (inputValue.trim().length > 0) {
            setShowSuggestions(true)
          }
        }}
        placeholder={value.length === 0 ? "Add tags (press Enter or comma)" : "Add another tag..."}
        className="w-full px-4 py-2 text-sm bg-transparent border border-charcoal/20
                   focus:border-charcoal/40 focus:outline-none
                   placeholder:text-charcoal-light/50 text-charcoal"
      />

      {/* Autocomplete suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-cream border border-charcoal/20 shadow-lg max-h-48 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-charcoal/10 text-charcoal'
                  : 'text-charcoal-light hover:bg-charcoal/5'
              }`}
            >
              #{suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
