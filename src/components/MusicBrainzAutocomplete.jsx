import { useState, useEffect, useRef } from 'react'
import { searchArtists, searchWithCoverArt, searchRecordingsByArtistIdWithCoverArt } from '../lib/musicbrainz'

/**
 * Autocomplete dropdown for song/artist powered by MusicBrainz.
 * Shows artist results when typing in artist field, song results when typing in song field.
 */
export default function MusicBrainzAutocomplete({
  artistValue,
  artistId, // MBID of selected artist (for precise song filtering)
  songValue,
  activeField, // 'artist' | 'song' | null
  onSelectArtist,
  onSelectSong,
  disabled = false,
}) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchMode, setSearchMode] = useState(null) // 'artist' | 'song'
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Determine what to search based on active field
  const shouldSearchArtist = activeField === 'artist' && artistValue && artistValue.length >= 2
  const shouldSearchSong = activeField === 'song' && songValue && songValue.length >= 2

  // Debug logging
  console.log('[MusicBrainz]', { activeField, artistValue, songValue, shouldSearchArtist, shouldSearchSong, disabled })

  // Debounced search
  useEffect(() => {
    if (disabled || (!shouldSearchArtist && !shouldSearchSong)) {
      setResults([])
      setIsOpen(false)
      return
    }

    console.log('[MusicBrainz] Starting search...', { shouldSearchArtist, shouldSearchSong })
    setLoading(true)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce 400ms for responsive feel while respecting rate limit
    debounceRef.current = setTimeout(async () => {
      console.log('[MusicBrainz] Debounce fired, searching...')
      try {
        if (shouldSearchArtist) {
          // Search for artists
          console.log('[MusicBrainz] Searching artists:', artistValue)
          const data = await searchArtists(artistValue, 5)
          console.log('[MusicBrainz] Artist results:', data)
          setResults(data)
          setSearchMode('artist')
          setIsOpen(data.length > 0)
        } else if (shouldSearchSong) {
          let data
          if (artistId) {
            // Use artist MBID for precise matching (best results)
            console.log('[MusicBrainz] Searching songs by artist ID:', artistId, songValue)
            data = await searchRecordingsByArtistIdWithCoverArt(artistId, songValue, 5)
          } else if (artistValue && artistValue.length >= 2) {
            // Fall back to artist name search
            const query = `artist:"${artistValue}" AND recording:"${songValue}"`
            data = await searchWithCoverArt(query, 5)
          } else {
            // Just song title search
            data = await searchWithCoverArt(songValue, 5)
          }
          console.log('[MusicBrainz] Song results:', data)
          setResults(data)
          setSearchMode('song')
          setIsOpen(data.length > 0)
        }
      } catch (err) {
        console.error('Search error:', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [artistValue, artistId, songValue, activeField, disabled, shouldSearchArtist, shouldSearchSong])

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

  const handleSelectArtist = (artist) => {
    onSelectArtist?.({
      name: artist.name,
      id: artist.id, // MBID for precise song filtering
    })
    setIsOpen(false)
    setResults([])
  }

  const handleSelectSong = (result) => {
    onSelectSong?.({
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

  if (disabled || (!loading && results.length === 0 && !isOpen)) {
    return null
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Loading indicator */}
      {loading && (
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
            <p className="text-xs text-charcoal/40">
              {searchMode === 'artist' ? 'Select artist' : 'Select to use verified metadata'}
            </p>
          </div>

          {searchMode === 'artist' ? (
            // Artist results
            results.map((artist) => (
              <button
                key={artist.id}
                type="button"
                onClick={() => handleSelectArtist(artist)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-charcoal/5 transition-colors text-left"
              >
                {/* Artist icon */}
                <div
                  className="w-10 h-10 flex-shrink-0 bg-charcoal/10 flex items-center justify-center rounded-full"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-charcoal/30">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>

                {/* Artist info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-charcoal truncate">
                    {artist.name}
                  </p>
                  <p className="text-xs text-charcoal/50 truncate">
                    {artist.disambiguation || artist.type || 'Artist'}
                    {artist.country && ` · ${artist.country}`}
                  </p>
                </div>
              </button>
            ))
          ) : (
            // Song results
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelectSong(result)}
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
            ))
          )}

          <div className="px-3 py-2 border-t border-charcoal/10">
            <p className="text-xs text-charcoal/30">Data from MusicBrainz</p>
          </div>
        </div>
      )}
    </div>
  )
}
