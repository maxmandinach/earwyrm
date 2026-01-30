import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ songs: [], artists: [], lyrics: [] })
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const debounceRef = useRef(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen])

  // Debounced FTS search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults({ songs: [], artists: [], lyrics: [] })
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const searchTerm = query.trim().split(/\s+/).join(' & ')

        const { data, error } = await supabase
          .from('lyrics')
          .select('id, content, song_title, artist_name')
          .eq('is_public', true)
          .textSearch('fts', searchTerm, { type: 'websearch' })
          .limit(15)

        if (error) {
          // Fallback to ILIKE if FTS column doesn't exist yet
          const { data: fallbackData } = await supabase
            .from('lyrics')
            .select('id, content, song_title, artist_name')
            .eq('is_public', true)
            .or(`content.ilike.%${query.trim()}%,song_title.ilike.%${query.trim()}%,artist_name.ilike.%${query.trim()}%`)
            .limit(15)

          if (fallbackData) {
            groupResults(fallbackData)
          }
          return
        }

        if (data) {
          groupResults(data)
        }
      } catch (err) {
        console.error('Search error:', err)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function groupResults(data) {
    const songSet = new Map()
    const artistSet = new Map()
    const lyricList = []

    data.forEach(l => {
      if (l.song_title) {
        const key = l.song_title.toLowerCase()
        if (!songSet.has(key)) {
          songSet.set(key, { title: l.song_title, artist: l.artist_name })
        }
      }
      if (l.artist_name) {
        const key = l.artist_name.toLowerCase()
        if (!artistSet.has(key)) {
          artistSet.set(key, l.artist_name)
        }
      }
      if (lyricList.length < 3) {
        lyricList.push(l)
      }
    })

    setResults({
      songs: Array.from(songSet.values()).slice(0, 3),
      artists: Array.from(artistSet.values()).slice(0, 3),
      lyrics: lyricList,
    })
  }

  function handleSelect(path) {
    navigate(path)
    setIsOpen(false)
    setQuery('')
  }

  const hasResults = results.songs.length > 0 || results.artists.length > 0 || results.lyrics.length > 0

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-3 text-charcoal-light hover:text-charcoal transition-colors"
        aria-label="Search"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false)
              setQuery('')
            }
          }}
          placeholder="Search lyrics, songs, artists..."
          className="w-48 sm:w-64 px-3 py-2 text-sm bg-transparent border-b border-charcoal/20 text-charcoal focus:outline-none focus:border-charcoal/40 placeholder:text-charcoal/30"
        />
        <button
          onClick={() => { setIsOpen(false); setQuery('') }}
          className="p-2 text-charcoal/30 hover:text-charcoal/60 text-sm"
        >
          ✕
        </button>
      </div>

      {/* Results dropdown */}
      {query.trim() && hasResults && (
        <div
          className="absolute right-0 top-full mt-1 w-72 shadow-lg z-50 max-h-80 overflow-auto"
          style={{
            backgroundColor: 'var(--surface-elevated, #FAF8F5)',
            border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          }}
        >
          {results.songs.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs text-charcoal/30 uppercase tracking-wider">Songs</div>
              {results.songs.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(`/song/${encodeURIComponent(s.title.toLowerCase())}${s.artist ? `?artist=${encodeURIComponent(s.artist)}` : ''}`)}
                  className="block w-full text-left px-3 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
                >
                  "{s.title}" {s.artist && <span className="text-charcoal/30">— {s.artist}</span>}
                </button>
              ))}
            </div>
          )}

          {results.artists.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs text-charcoal/30 uppercase tracking-wider border-t border-charcoal/5">Artists</div>
              {results.artists.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(`/artist/${encodeURIComponent(a.toLowerCase())}`)}
                  className="block w-full text-left px-3 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
                >
                  {a}
                </button>
              ))}
            </div>
          )}

          {results.lyrics.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs text-charcoal/30 uppercase tracking-wider border-t border-charcoal/5">Lyrics</div>
              {results.lyrics.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    if (l.song_title) {
                      handleSelect(`/song/${encodeURIComponent(l.song_title.toLowerCase())}${l.artist_name ? `?artist=${encodeURIComponent(l.artist_name)}` : ''}`)
                    } else {
                      handleSelect('/explore')
                    }
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-charcoal/50 hover:bg-charcoal/5 transition-colors truncate"
                  style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
                >
                  {l.content.slice(0, 60)}{l.content.length > 60 ? '...' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
