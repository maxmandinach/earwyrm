import { useState, useEffect, useRef, useCallback } from 'react'
import { ALL_GENRES, SUGGESTED_ARTISTS } from '../lib/suggestedArtists'
import { searchArtists } from '../lib/musicbrainz'
import { useFollow } from '../contexts/FollowContext'

export default function InterestPicker({ onComplete }) {
  const [step, setStep] = useState(0) // 0: genres, 1: artists
  const [selectedGenres, setSelectedGenres] = useState(new Set())

  if (step === 0) {
    return (
      <GenrePicker
        selectedGenres={selectedGenres}
        setSelectedGenres={setSelectedGenres}
        onNext={() => setStep(1)}
      />
    )
  }

  return (
    <ArtistDiscovery
      selectedGenres={selectedGenres}
      onBack={() => setStep(0)}
      onComplete={onComplete}
    />
  )
}

function GenrePicker({ selectedGenres, setSelectedGenres, onNext }) {
  function toggleGenre(genre) {
    setSelectedGenres(prev => {
      const next = new Set(prev)
      if (next.has(genre)) {
        next.delete(genre)
      } else {
        next.add(genre)
      }
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-12">
      <h1
        className="text-3xl text-charcoal mb-1"
        style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
      >
        what do you listen to?
      </h1>
      <p className="text-sm text-charcoal/40 mb-8">pick your favorite genres</p>

      <div
        className="w-full max-w-md mb-8"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {ALL_GENRES.map(genre => {
          const selected = selectedGenres.has(genre)
          return (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className="py-2 px-1 text-sm transition-all"
              style={{
                borderRadius: '999px',
                border: selected ? '1.5px solid #B8A99A' : '1.5px solid var(--border-medium, rgba(0,0,0,0.1))',
                backgroundColor: selected ? '#B8A99A' : 'transparent',
                color: selected ? '#fff' : 'var(--text-secondary, #6B635A)',
                fontWeight: selected ? 500 : 400,
              }}
            >
              {genre}
            </button>
          )
        })}
      </div>

      {selectedGenres.size > 0 && (
        <button
          onClick={onNext}
          className="px-8 py-3 text-lg font-medium transition-all"
          style={{
            fontFamily: "'Caveat', cursive",
            backgroundColor: 'var(--text-primary, #2C2825)',
            color: 'var(--surface-bg, #FAF8F5)',
          }}
        >
          Next
        </button>
      )}
    </div>
  )
}

function ArtistDiscovery({ selectedGenres, onBack, onComplete }) {
  const { follow, unfollow, isFollowing, follows } = useFollow()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const searchIdRef = useRef(0)
  const inputRef = useRef(null)

  const followedCount = follows.filter(f => f.filter_type === 'artist').length

  // Suggested artists filtered by selected genres
  const suggested = SUGGESTED_ARTISTS.filter(a => selectedGenres.has(a.genre))

  // Local matches from full artist list
  const localMatches = query.length >= 2
    ? SUGGESTED_ARTISTS.filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
    : []

  // Dedup local matches against API results
  const apiNames = new Set(searchResults.map(r => r.name.toLowerCase()))
  const uniqueLocalMatches = localMatches.filter(a => !apiNames.contains?.(a.name.toLowerCase()) && !apiNames.has(a.name.toLowerCase()))

  // Debounced MusicBrainz search
  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const id = ++searchIdRef.current
    const timer = setTimeout(async () => {
      const results = await searchArtists(query, 8)
      if (searchIdRef.current === id) {
        setSearchResults(results)
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleToggleFollow = useCallback(async (artistName) => {
    if (isFollowing('artist', artistName)) {
      await unfollow('artist', artistName)
    } else {
      await follow('artist', artistName)
    }
  }, [isFollowing, follow, unfollow])

  const showingSearch = query.length >= 2

  return (
    <div className="flex-1 flex flex-col px-4 py-12 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-4">
        <h1
          className="text-3xl text-charcoal mb-2"
          style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
        >
          follow some artists
        </h1>
        {/* Genre pills */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-4">
          {[...selectedGenres].map(genre => (
            <span
              key={genre}
              className="px-2 py-0.5 text-xs"
              style={{
                borderRadius: '999px',
                backgroundColor: '#B8A99A',
                color: '#fff',
              }}
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* Search input */}
      <div
        className="flex items-center gap-2 px-3 py-2 mb-4"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          borderRadius: '8px',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'var(--text-muted, #9C948A)', flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search artists..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary, #2C2825)' }}
          autoCorrect="off"
          autoCapitalize="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setSearchResults([]); inputRef.current?.focus() }}
            className="text-charcoal/30 hover:text-charcoal/60"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Follow count pill */}
      {followedCount > 0 && (
        <div className="text-center mb-3">
          <span
            className="inline-block px-3 py-1 text-xs"
            style={{
              borderRadius: '999px',
              backgroundColor: 'var(--surface-card, #F5F2ED)',
              color: 'var(--text-secondary, #6B635A)',
              border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
            }}
          >
            {followedCount} followed
          </span>
        </div>
      )}

      {/* Artist list */}
      <div className="flex-1 overflow-auto -mx-4 px-4" style={{ minHeight: 0 }}>
        {showingSearch ? (
          <div>
            {/* Local matches first */}
            {uniqueLocalMatches.map(artist => (
              <ArtistRow
                key={`local-${artist.name}`}
                name={artist.name}
                isFollowing={isFollowing('artist', artist.name)}
                onToggle={() => handleToggleFollow(artist.name)}
              />
            ))}

            {/* API results */}
            {isSearching && searchResults.length === 0 && uniqueLocalMatches.length === 0 && (
              <p className="text-sm text-charcoal/30 py-4 text-center">searching artists...</p>
            )}
            {isSearching && searchResults.length === 0 && uniqueLocalMatches.length > 0 && (
              <p className="text-xs text-charcoal/25 py-2 text-center">searching more...</p>
            )}
            {!isSearching && searchResults.length === 0 && uniqueLocalMatches.length === 0 && query.length >= 2 && (
              <p className="text-sm text-charcoal/30 py-4 text-center">no artists found</p>
            )}
            {searchResults.map(artist => (
              <ArtistRow
                key={`api-${artist.id}`}
                name={artist.name}
                disambiguation={artist.disambiguation}
                isFollowing={isFollowing('artist', artist.name)}
                onToggle={() => handleToggleFollow(artist.name)}
              />
            ))}
          </div>
        ) : (
          <div>
            <p className="text-xs text-charcoal/30 mb-2 lowercase">popular artists</p>
            {suggested.map(artist => (
              <ArtistRow
                key={artist.name}
                name={artist.name}
                isFollowing={isFollowing('artist', artist.name)}
                onToggle={() => handleToggleFollow(artist.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-6">
        <button
          onClick={onBack}
          className="text-sm text-charcoal/40 hover:text-charcoal/60 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onComplete}
          className="px-6 py-2.5 text-sm font-medium transition-all"
          style={{
            fontFamily: "'Caveat', cursive",
            fontSize: '1.1rem',
            backgroundColor: 'var(--text-primary, #2C2825)',
            color: 'var(--surface-bg, #FAF8F5)',
          }}
        >
          {followedCount > 0 ? 'Done' : 'Skip'}
        </button>
      </div>
    </div>
  )
}

function ArtistRow({ name, disambiguation, isFollowing, onToggle }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await onToggle()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary, #2C2825)' }}>
          {name}
        </p>
        {disambiguation && (
          <p className="text-xs truncate" style={{ color: 'var(--text-muted, #9C948A)' }}>
            {disambiguation}
          </p>
        )}
      </div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="ml-3 px-3 py-1 text-xs rounded-full transition-colors shrink-0"
        style={{
          backgroundColor: isFollowing ? 'var(--text-primary, #2C2825)' : 'transparent',
          color: isFollowing ? 'var(--surface-bg, #FAF8F5)' : 'var(--text-secondary, #6B635A)',
          border: isFollowing ? '1px solid transparent' : '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          opacity: loading ? 0.5 : 1,
        }}
      >
        {isFollowing ? 'following' : 'follow'}
      </button>
    </div>
  )
}
