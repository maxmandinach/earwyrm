import { useState, useEffect, useRef } from 'react'
import { searchArtists, fetchArtistRecordings, filterRecordingsByTitle, getCoverArtForRecording, searchRecordingsByArtistId } from '../lib/musicbrainz'

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
  const [artistRecordings, setArtistRecordings] = useState([]) // Prefetched songs
  const [prefetchedArtistId, setPrefetchedArtistId] = useState(null)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Determine what to search based on active field
  const shouldSearchArtist = activeField === 'artist' && artistValue && artistValue.length >= 2
  const shouldSearchSong = activeField === 'song' && songValue && songValue.length >= 1

  // Prefetch artist recordings when artist is selected
  useEffect(() => {
    if (artistId && artistId !== prefetchedArtistId) {
      console.log('[Prefetch] Starting for artist:', artistId)
      setPrefetchedArtistId(artistId)
      fetchArtistRecordings(artistId, 100).then(recordings => {
        console.log('[Prefetch] Got recordings:', recordings.length)
        setArtistRecordings(recordings)
      }).catch(err => {
        console.error('[Prefetch] Error:', err)
      })
    }
  }, [artistId, prefetchedArtistId])

  // Song search - instant local filtering when prefetched, fallback to API
  useEffect(() => {
    console.log('[Song Search]', {
      shouldSearchSong,
      activeField,
      artistId,
      songValue,
      prefetchedArtistId,
      artistRecordingsCount: artistRecordings.length
    })

    if (disabled || !shouldSearchSong) {
      return
    }

    // If we have prefetched recordings for this artist, filter locally (instant!)
    if (artistId && artistRecordings.length > 0 && prefetchedArtistId === artistId) {
      console.log('[Song Search] Using local filter')
      const filtered = filterRecordingsByTitle(artistRecordings, songValue)
      console.log('[Song Search] Filtered results:', filtered.length)
      setResults(filtered)
      setSearchMode('song')
      setIsOpen(filtered.length > 0)
      setLoading(false)
      return
    }

    // Fallback: API search if no prefetched data yet
    if (artistId && songValue.length >= 2) {
      console.log('[Song Search] Using API fallback')
      setLoading(true)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(async () => {
        try {
          const data = await searchRecordingsByArtistId(artistId, songValue, 8)
          console.log('[Song Search] API results:', data.length)
          setResults(data)
          setSearchMode('song')
          setIsOpen(data.length > 0)
        } catch (err) {
          console.error('MusicBrainz search error:', err)
          setResults([])
        } finally {
          setLoading(false)
        }
      }, 200)

      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }
      }
    }
  }, [songValue, artistId, artistRecordings, prefetchedArtistId, disabled, shouldSearchSong, activeField])

  // Debounced search for artists only
  useEffect(() => {
    if (disabled || !shouldSearchArtist) {
      if (searchMode === 'artist') {
        setResults([])
        setIsOpen(false)
      }
      return
    }

    setLoading(true)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchArtists(artistValue, 5)
        setResults(data)
        setSearchMode('artist')
        setIsOpen(data.length > 0)
      } catch (err) {
        console.error('MusicBrainz search error:', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [artistValue, disabled, shouldSearchArtist, searchMode])

  // Close on click outside (use mouseup to allow scrollbar interaction)
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mouseup', handleClickOutside)
      return () => document.removeEventListener('mouseup', handleClickOutside)
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

  const handleSelectSong = async (result) => {
    // Immediately close and pass basic data
    setIsOpen(false)
    setResults([])

    // Fetch cover art in background, then update
    const coverArtUrl = await getCoverArtForRecording(result)

    onSelectSong?.({
      artist: result.artist,
      song: result.title,
      album: result.album,
      coverArtUrl: coverArtUrl,
      musicbrainzRecordingId: result.id,
      musicbrainzReleaseId: result.releaseId,
    })
  }

  if (disabled || (!loading && results.length === 0 && !isOpen)) {
    return null
  }

  return (
    <div className="relative">
      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-0 -top-6 text-xs text-charcoal/30">
          searching...
        </div>
      )}

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={containerRef}
          className="absolute z-50 w-full mt-1 shadow-lg rounded"
          style={{
            backgroundColor: 'var(--surface-elevated, #FAF8F5)',
            border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          <div className="px-3 py-2 border-b border-charcoal/10 sticky top-0 bg-inherit">
            <p className="text-xs text-charcoal/40">
              {searchMode === 'artist' ? 'Select artist' : 'Select song'}
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
