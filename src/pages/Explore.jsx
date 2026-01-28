import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useFollow } from '../contexts/FollowContext'
import { useAuth } from '../contexts/AuthContext'
import LyricCard from '../components/LyricCard'

const isDev = import.meta.env.DEV

// Mock public notes for testing
const MOCK_NOTES = {
  'mock-1': { content: "This line hits different at 2am when you're questioning everything" },
  'mock-3': { content: "The way this captures feeling trapped by your own choices..." },
  'mock-4': { content: "My dad used to play this. Now I get it." },
  'mock-7': { content: "Wedding song vibes but also just... truth" },
}

// Mock public lyrics for testing
const MOCK_LYRICS = [
  {
    id: 'mock-1',
    content: "I'm just a soul whose intentions are good\nOh Lord, please don't let me be misunderstood",
    song_title: "Don't Let Me Be Misunderstood",
    artist_name: 'Nina Simone',
    tags: ['Nostalgia', 'Late Night'],
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_public: true,
  },
  {
    id: 'mock-2',
    content: 'And I find it kind of funny, I find it kind of sad\nThe dreams in which I\'m dying are the best I\'ve ever had',
    song_title: 'Mad World',
    artist_name: 'Tears for Fears',
    tags: ['Melancholy', 'Driving'],
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    is_public: true,
  },
  {
    id: 'mock-3',
    content: 'We are all just prisoners here, of our own device',
    song_title: 'Hotel California',
    artist_name: 'Eagles',
    tags: ['Late Night', 'Nostalgic'],
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    is_public: true,
  },
  {
    id: 'mock-4',
    content: "Hello darkness, my old friend\nI've come to talk with you again",
    song_title: 'The Sound of Silence',
    artist_name: 'Simon & Garfunkel',
    tags: ['Melancholy', 'Nostalgia'],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    is_public: true,
  },
  {
    id: 'mock-5',
    content: 'Is this the real life? Is this just fantasy?',
    song_title: 'Bohemian Rhapsody',
    artist_name: 'Queen',
    tags: ['Driving', 'Hopeful'],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_public: true,
  },
  {
    id: 'mock-6',
    content: "They tried to make me go to rehab, I said no, no, no",
    song_title: 'Rehab',
    artist_name: 'Amy Winehouse',
    tags: ['Late Night'],
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    is_public: true,
  },
  {
    id: 'mock-7',
    content: 'Cause all of me loves all of you\nLove your curves and all your edges\nAll your perfect imperfections',
    song_title: 'All of Me',
    artist_name: 'John Legend',
    tags: ['Heartbreak', 'Hopeful'],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    is_public: true,
  },
  {
    id: 'mock-8',
    content: "But I'm only human after all\nDon't put the blame on me",
    song_title: 'Human',
    artist_name: 'Rag\'n\'Bone Man',
    tags: ['Driving', 'Summer'],
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    is_public: true,
  },
]

// Trending tags for filter chips
const TRENDING_TAGS = ['Nostalgia', 'Late Night', 'Driving', 'Heartbreak', 'Summer', 'Hopeful']

export default function Explore() {
  const { filterType, filterValue } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { isFollowing, follow, unfollow } = useFollow()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({}) // Map of lyric_id -> note
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)

  // Decode filter value for display
  const decodedFilterValue = filterValue ? decodeURIComponent(filterValue) : null

  // Get artist name for song filter (from first matching lyric)
  const songArtist = filterType === 'song' && lyrics.length > 0 ? lyrics[0].artist_name : null

  // Check if currently following this filter
  const currentlyFollowing = filterType && decodedFilterValue
    ? isFollowing(filterType, decodedFilterValue)
    : false

  async function handleToggleFollow() {
    if (!filterType || !decodedFilterValue || isTogglingFollow) return
    setIsTogglingFollow(true)
    try {
      if (currentlyFollowing) {
        await unfollow(filterType, decodedFilterValue)
      } else {
        await follow(filterType, decodedFilterValue)
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
    } finally {
      setIsTogglingFollow(false)
    }
  }

  useEffect(() => {
    async function fetchLyrics() {
      setLoading(true)
      setError(null)

      // Use mock data if toggled
      if (useMockData) {
        let filtered = [...MOCK_LYRICS]
        if (filterType === 'tag' && decodedFilterValue) {
          filtered = filtered.filter(l => l.tags?.some(t => t.toLowerCase() === decodedFilterValue.toLowerCase()))
        } else if (filterType === 'artist' && decodedFilterValue) {
          filtered = filtered.filter(l => l.artist_name?.toLowerCase() === decodedFilterValue.toLowerCase())
        } else if (filterType === 'song' && decodedFilterValue) {
          filtered = filtered.filter(l => l.song_title?.toLowerCase() === decodedFilterValue.toLowerCase())
        }
        setLyrics(filtered)
        setNotes(MOCK_NOTES)
        setLoading(false)
        return
      }

      try {
        let query = supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(50)

        // Apply filters based on route
        if (filterType === 'tag' && decodedFilterValue) {
          query = query.contains('tags', [decodedFilterValue])
        } else if (filterType === 'artist' && decodedFilterValue) {
          query = query.ilike('artist_name', decodedFilterValue)
        } else if (filterType === 'song' && decodedFilterValue) {
          query = query.ilike('song_title', decodedFilterValue)
        }

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError
        setLyrics(data || [])

        // Fetch public notes for these lyrics
        if (data && data.length > 0) {
          const lyricIds = data.map(l => l.id)
          const { data: notesData } = await supabase
            .from('lyric_notes')
            .select('*')
            .in('lyric_id', lyricIds)
            .eq('is_public', true)

          if (notesData) {
            const notesMap = {}
            notesData.forEach(note => {
              notesMap[note.lyric_id] = note
            })
            setNotes(notesMap)
          }
        }
      } catch (err) {
        console.error('Error fetching lyrics:', err)
        setError('Failed to load lyrics')
      } finally {
        setLoading(false)
      }
    }

    fetchLyrics()
  }, [filterType, decodedFilterValue, useMockData])

  // Build page title
  const getTitle = () => {
    if (!filterType) return 'explore'
    if (filterType === 'tag') return `#${decodedFilterValue}`
    if (filterType === 'artist') return decodedFilterValue
    if (filterType === 'song') {
      return songArtist
        ? `"${decodedFilterValue}" — ${songArtist}`
        : `"${decodedFilterValue}"`
    }
    return 'explore'
  }

  // Filter displayed lyrics by search query
  const displayedLyrics = searchQuery.trim()
    ? lyrics.filter(l =>
        l.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.artist_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : lyrics

  return (
    <div className="flex-1 flex flex-col px-4 py-8">
      {/* Header */}
      <div className="max-w-lg mx-auto w-full mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {filterType && (
              <Link
                to="/explore"
                className="text-charcoal-light hover:text-charcoal transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase">
              {getTitle()}
            </h1>

            {/* Follow button - only show on filtered views for logged in users */}
            {filterType && user && (
              <button
                onClick={handleToggleFollow}
                disabled={isTogglingFollow}
                className={`ml-3 px-3 py-1 text-xs border transition-colors ${
                  currentlyFollowing
                    ? 'border-charcoal/30 text-charcoal/50 hover:border-charcoal/50'
                    : 'border-charcoal/20 text-charcoal/40 hover:border-charcoal/40 hover:text-charcoal/60'
                }`}
              >
                {currentlyFollowing ? 'following' : 'follow'}
              </button>
            )}
          </div>
          {isDev && (
            <button
              onClick={() => setUseMockData(!useMockData)}
              className="text-xs px-3 py-1.5 border border-charcoal/20 hover:border-charcoal/40
                         transition-colors text-charcoal/30 rounded-sm"
              title="Toggle mock data for testing"
            >
              {useMockData ? '✕ mock' : '+ mock'}
            </button>
          )}
        </div>

        {filterType && (
          <p className="text-xs text-charcoal/30 mb-4">
            {lyrics.length} {lyrics.length === 1 ? 'lyric' : 'lyrics'} shared
          </p>
        )}

        {/* Search bar */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lyrics, songs, artists, tags..."
            className="w-full px-4 py-3 text-sm bg-white border border-charcoal/10
                     text-charcoal focus:outline-none focus:border-charcoal/30
                     placeholder:text-charcoal/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal/60"
            >
              ✕
            </button>
          )}

          {/* Search suggestions - show when typing */}
          {searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-charcoal/10 shadow-lg z-10">
              <div className="p-2 text-xs text-charcoal/40 border-b border-charcoal/5">
                Jump to...
              </div>
              <Link
                to={`/explore/tag/${encodeURIComponent(searchQuery.trim())}`}
                onClick={() => setSearchQuery('')}
                className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                #{searchQuery.trim()} <span className="text-charcoal/30">— tag</span>
              </Link>
              <Link
                to={`/explore/artist/${encodeURIComponent(searchQuery.trim())}`}
                onClick={() => setSearchQuery('')}
                className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                {searchQuery.trim()} <span className="text-charcoal/30">— artist</span>
              </Link>
              <Link
                to={`/explore/song/${encodeURIComponent(searchQuery.trim())}`}
                onClick={() => setSearchQuery('')}
                className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                "{searchQuery.trim()}" <span className="text-charcoal/30">— song</span>
              </Link>
            </div>
          )}
        </div>

        {/* Trending tags - only show on main explore page */}
        {!filterType && (
          <div className="flex flex-wrap gap-2">
            {TRENDING_TAGS.map((tag) => (
              <Link
                key={tag}
                to={`/explore/tag/${encodeURIComponent(tag)}`}
                className="px-3 py-1.5 text-xs border border-charcoal/10 text-charcoal/50
                         hover:border-charcoal/30 hover:text-charcoal/70 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-charcoal-light text-sm">Loading...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : displayedLyrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p
            className="text-xl mb-2"
            style={{
              fontFamily: "'Caveat', cursive",
              color: '#6B635A',
            }}
          >
            {searchQuery ? 'No matches' : filterType ? 'No lyrics here yet' : 'Nothing to explore yet'}
          </p>
          <p className="text-sm text-charcoal-light">
            {searchQuery
              ? 'Try a different search'
              : filterType
              ? 'Be the first to share one'
              : 'Lyrics shared publicly will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-lg mx-auto w-full">
          {displayedLyrics.map((lyric) => (
            <div key={lyric.id}>
              <LyricCard
                lyric={lyric}
                showTimestamp
                linkable
                className="border border-charcoal/10"
              />
              {/* Public note if available */}
              {notes[lyric.id] && (
                <div
                  className="mt-4 pl-4 border-l-2 border-charcoal/10 max-w-lg mx-auto"
                  style={{
                    transform: 'rotate(-0.5deg)',
                    transformOrigin: 'left top',
                  }}
                >
                  <p
                    className="text-charcoal/50 leading-relaxed"
                    style={{ fontFamily: "'Caveat', cursive", fontSize: '1.25rem' }}
                  >
                    {notes[lyric.id].content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
