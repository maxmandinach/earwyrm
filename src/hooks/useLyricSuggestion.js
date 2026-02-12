import { useState, useEffect, useRef } from 'react'
import { searchByLyrics } from '../lib/genius'

/**
 * Hook that suggests artist/song based on lyric text using Genius search.
 * Fires when lyrics are long enough and artist+song fields are empty.
 * Returns a suggestion the user can accept or dismiss.
 */
export default function useLyricSuggestion(lyricText, artistName, songTitle) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const debounceRef = useRef(null)
  const lastQueryRef = useRef('')

  // Reset dismissed state when lyric text changes significantly
  useEffect(() => {
    setDismissed(false)
  }, [lyricText])

  useEffect(() => {
    // Don't search if:
    // - Lyrics too short (need a meaningful snippet)
    // - Artist and song already filled in
    // - User dismissed the suggestion
    const hasLyrics = lyricText && lyricText.trim().length >= 15
    const fieldsEmpty = !artistName?.trim() && !songTitle?.trim()

    if (!hasLyrics || !fieldsEmpty || dismissed) {
      setSuggestions([])
      setLoading(false)
      return
    }

    // Don't re-search if lyrics haven't changed meaningfully
    const query = lyricText.trim()
    if (query === lastQueryRef.current) return

    setLoading(true)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      lastQueryRef.current = query
      try {
        const results = await searchByLyrics(query)
        // Dedupe by title+artist (Genius sometimes returns duplicates)
        const seen = new Set()
        const unique = results.filter(r => {
          const key = `${r.title}::${r.artist}`.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setSuggestions(unique.slice(0, 3))
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 800) // Longer debounce — no need to rush, user is still typing lyrics

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [lyricText, artistName, songTitle, dismissed])

  const dismiss = () => {
    setDismissed(true)
    setSuggestions([])
  }

  return { suggestions, loading, dismiss }
}
