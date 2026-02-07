import { useState, useEffect, useRef } from 'react'
import { searchWithCoverArt, searchByArtistAndSongWithCoverArt } from '../lib/musicbrainz'

/**
 * Autocomplete dropdown for song/artist powered by MusicBrainz.
 * Shows results with cover art thumbnails.
 */
export default function MusicBrainzAutocomplete({
  artistValue,
  songValue,
  onSelect,
  disabled = false,
}) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Need at least one field with 2+ chars
  const hasArtist = artistValue && artistValue.length >= 2
  const hasSong = songValue && songValue.length >= 2
  const shouldSearch = hasArtist || hasSong

  // Debounced search
  useEffect(() => {
    if (disabled || !shouldSearch) {
      setResults([])
      setIsOpen(false)
      return
    }

    setLoading(true)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce 600ms to respect MusicBrainz rate limit
    debounceRef.current = setTimeout(async () => {
      try {
        // Use structured search when we have artist or song
        const data = await searchByArtistAndSongWithCoverArt(artistValue, songValue, 5)
        setResults(data)
        setIsOpen(data.length > 0)
      } catch (err) {
        console.error('Search error:', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 600)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [artistValue, songValue, disabled, shouldSearch])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (result) => {
    onSelect({
      artist: result.artist,
      song: result.title,
      album: result.album,
      coverArtUrl: result.coverArtUrl,
      musicbrainzRecordingId: result.id,
      musicbrainzReleaseId: result.releaseId,
    })
    setIsOpen(false)
    setResults([])
  }

  if (disabled || (!loading && results.length === 0 && !isOpen) || !shouldSearch) {
    return null
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Loading indicator */}
      {loading && query.length >= 3 && (
        <div className="absolute right-0 -top-6 text-xs text-charcoal/30">
          searching...
        </div>
      )}

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 shadow-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-elevated, #FAF8F5)',
            border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          }}
        >
          <div className="px-3 py-2 border-b border-charcoal/10">
            <p className="text-xs text-charcoal/40">Select to use verified metadata</p>
          </div>

          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-charcoal/5 transition-colors text-left"
            >
              {/* Cover art thumbnail */}
              <div
                className="w-10 h-10 flex-shrink-0 bg-charcoal/10"
                style={{
                  backgroundImage: result.coverArtUrl ? `url(${result.coverArtUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!result.coverArtUrl && (
                  <div className="w-full h-full flex items-center justify-center text-charcoal/20">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Song info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-charcoal truncate">
                  {result.title}
                </p>
                <p className="text-xs text-charcoal/50 truncate">
                  {result.artist}
                  {result.album && ` · ${result.album}`}
                  {result.year && ` (${result.year})`}
                </p>
              </div>
            </button>
          ))}

          <div className="px-3 py-2 border-t border-charcoal/10">
            <p className="text-xs text-charcoal/30">Data from MusicBrainz</p>
          </div>
        </div>
      )}
    </div>
  )
}
