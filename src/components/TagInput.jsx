import { useState, useRef, useEffect } from 'react'

// Trending/suggested tags for new users
const TRENDING_TAGS = ['Nostalgia', 'Late Night', 'Driving', 'Heartbreak', 'Summer', 'Hopeful']

export default function TagInput({ value = [], onChange, suggestions = [], showSuggestionsOnFocus = false }) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  // Combine user suggestions with trending, prioritizing user's tags
  const allSuggestions = [...new Set([...suggestions, ...TRENDING_TAGS])]

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = allSuggestions
    .filter(tag =>
      (inputValue.trim() === '' || tag.toLowerCase().includes(inputValue.toLowerCase().trim())) &&
      !value.map(t => t.toLowerCase()).includes(tag.toLowerCase())
    )
    .slice(0, 6) // Limit to 6 suggestions

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
      {/* Tag chips display - signature style */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1"
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: '1.125rem',
                backgroundColor: 'var(--surface-elevated, #F5F0E8)',
                color: 'var(--text-secondary, #6B635A)',
                border: '1px solid var(--border-medium, rgba(107, 99, 90, 0.3))',
              }}
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="opacity-50 hover:opacity-100 transition-opacity"
                aria-label={`Remove ${tag} tag`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input field - signature style */}
      <div
        className="px-4 py-3 border border-charcoal/10"
        style={{ backgroundColor: 'var(--surface-elevated, #F5F0E8)' }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (showSuggestionsOnFocus || inputValue.trim().length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={value.length === 0 ? "Add a tag..." : "Add another..."}
          className="w-full bg-transparent focus:outline-none placeholder:opacity-40"
          style={{
            fontFamily: "'Caveat', cursive",
            fontSize: '1.25rem',
            color: 'var(--text-primary, #2C2825)',
          }}
        />
      </div>

      {/* Autocomplete suggestions - signature style */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          className="absolute z-10 w-full mt-1 border border-charcoal/10 shadow-lg max-h-48 overflow-auto"
          style={{ backgroundColor: 'var(--surface-elevated, #F5F0E8)' }}
        >
          <div className="px-3 py-1.5 text-xs text-charcoal/40 border-b border-charcoal/10">
            {suggestions.length > 0 ? 'Your tags & trending' : 'Trending tags'}
          </div>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className={`w-full px-4 py-2 text-left transition-colors ${
                index === selectedIndex ? 'bg-charcoal/10' : 'hover:bg-charcoal/5'
              }`}
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: '1.125rem',
                color: 'var(--text-secondary, #6B635A)',
              }}
            >
              #{suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
