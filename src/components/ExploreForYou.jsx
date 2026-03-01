import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useFollow } from '../contexts/FollowContext'
import { useAuth } from '../contexts/AuthContext'
import { useBlock } from '../contexts/BlockContext'
import LyricCard from './LyricCard'
import ExploreSearchInput from './ExploreSearchInput'
import SortDropdown from './SortDropdown'

const PAGE_SIZE = 20

const TIME_OPTIONS = [
  { key: 'all', label: 'all time' },
  { key: 'week', label: 'this week' },
  { key: 'today', label: 'today' },
]

export default function ExploreForYou() {
  const { user } = useAuth()
  const { follows } = useFollow()
  const { isBlocked } = useBlock()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [timeRange, setTimeRange] = useState('all')
  const [trendingTags, setTrendingTags] = useState([])
  const [activeTags, setActiveTags] = useState(null) // null = show all, Set = specific tags
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const searchContainerRef = useRef(null)

  // Close search on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    if (searchOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [searchOpen])

  // Fetch trending tags
  useEffect(() => {
    async function fetchTrendingTags() {
      try {
        const { data } = await supabase
          .from('lyrics')
          .select('tags')
          .eq('is_public', true)
          .not('tags', 'eq', '{}')
          .limit(200)

        if (data) {
          const tagCounts = {}
          data.forEach(l => {
            (l.tags || []).forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
          })
          const sorted = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }))
          setTrendingTags(sorted)
        }
      } catch (err) {
        console.error('Error fetching trending tags:', err)
        setTrendingTags([
          { tag: 'Nostalgia', count: 0 }, { tag: 'Late Night', count: 0 },
          { tag: 'Driving', count: 0 }, { tag: 'Heartbreak', count: 0 },
          { tag: 'Summer', count: 0 }, { tag: 'Hopeful', count: 0 },
        ])
      }
    }

    fetchTrendingTags()
  }, [])

  // Fetch lyrics
  useEffect(() => {
    async function fetchLyrics() {
      setLoading(true)
      setError(null)
      setVisibleCount(PAGE_SIZE)

      try {
        let query = supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .limit(80)

        if (sortBy === 'newest') {
          query = query.order('created_at', { ascending: false })
        } else if (sortBy === 'resonated') {
          query = query.order('reaction_count', { ascending: false, nullsFirst: false })
        } else if (sortBy === 'discussed') {
          query = query.order('comment_count', { ascending: false, nullsFirst: false })
        }

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError
        setLyrics(data || [])

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
              if (!notesMap[note.lyric_id]) notesMap[note.lyric_id] = []
              notesMap[note.lyric_id].push(note)
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
  }, [sortBy])

  // Exclude followed content for logged-in users
  const artistFollows = follows.filter(f => f.filter_type === 'artist').map(f => f.filter_value)
  const songFollows = follows.filter(f => f.filter_type === 'song').map(f => f.filter_value)
  const tagFollows = follows.filter(f => f.filter_type === 'tag').map(f => f.filter_value)

  let displayedLyrics = (follows.length > 0
    ? lyrics.filter(l => {
        if (artistFollows.some(a => l.artist_name?.toLowerCase() === a.toLowerCase())) return false
        if (songFollows.some(s => l.song_title?.toLowerCase() === s.toLowerCase())) return false
        if (tagFollows.some(t => l.tags?.some(lt => lt.toLowerCase() === t.toLowerCase()))) return false
        return true
      })
    : lyrics
  ).filter(l => !l.user_id || !isBlocked(l.user_id))

  // Apply tag filter
  if (activeTags !== null && activeTags.size > 0) {
    displayedLyrics = displayedLyrics.filter(l =>
      l.tags?.some(t => activeTags.has(t))
    )
  } else if (activeTags !== null && activeTags.size === 0) {
    displayedLyrics = []
  }

  // Apply time range filter
  if (timeRange !== 'all') {
    const now = new Date()
    const cutoff = timeRange === 'today'
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    displayedLyrics = displayedLyrics.filter(l =>
      new Date(l.created_at) >= cutoff
    )
  }

  // Apply search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    displayedLyrics = displayedLyrics.filter(l =>
      l.content.toLowerCase().includes(q) ||
      l.song_title?.toLowerCase().includes(q) ||
      l.artist_name?.toLowerCase().includes(q) ||
      l.tags?.some(t => t.toLowerCase().includes(q))
    )
  }

  const visibleLyrics = displayedLyrics.slice(0, visibleCount)
  const hasMore = displayedLyrics.length > visibleCount

  const isAnon = !user

  // Tag toggle
  function handleToggleTag(tag) {
    setActiveTags(prev => {
      if (prev === null) {
        return new Set([tag])
      }
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      if (next.size === 0) return null
      return next
    })
  }

  function isTagActive(tag) {
    return activeTags === null || activeTags.has(tag)
  }

  const hasActiveTagFilter = activeTags !== null

  return (
    <>
      {/* Moods / trending tags — horizontal scroll, toggleable */}
      {trendingTags.length > 0 && (
        <div className="mb-4">
          <div className="flex overflow-x-auto -mx-4 px-4 scrollbar-hide gap-2">
            {trendingTags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`px-3 py-2 text-xs border rounded-full transition-colors whitespace-nowrap shrink-0 ${
                  isTagActive(tag)
                    ? hasActiveTagFilter
                      ? 'border-charcoal/40 text-charcoal/70 bg-charcoal/5'
                      : 'border-charcoal/10 text-charcoal/50 bg-transparent'
                    : 'border-charcoal/10 text-charcoal/30 bg-transparent'
                }`}
              >
                #{tag}
                {count > 0 && (
                  <span className="ml-1 text-charcoal/20 text-[10px]">{count}</span>
                )}
              </button>
            ))}
            {hasActiveTagFilter && (
              <button
                onClick={() => setActiveTags(null)}
                className="px-2 py-2 text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors whitespace-nowrap shrink-0"
              >
                clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search + Time + Sort compact row */}
      {searchOpen ? (
        <div ref={searchContainerRef} className="relative mb-4">
          <ExploreSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search lyrics, songs, artists, tags..."
            autoFocus
          />

          {/* Jump to dropdown */}
          {searchQuery.trim() && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-lg shadow-lg z-10 overflow-hidden"
              style={{
                backgroundColor: 'var(--surface-elevated, #FAF8F5)',
                border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
              }}
            >
              <div className="p-2 text-xs text-charcoal/40 border-b border-charcoal/5">
                Jump to...
              </div>
              <Link
                to={`/explore/tag/${encodeURIComponent(searchQuery.trim())}`}
                onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
                className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                #{searchQuery.trim()} <span className="text-charcoal/30">— tag</span>
              </Link>
              <Link
                to={`/artist/${encodeURIComponent(searchQuery.trim().toLowerCase())}`}
                onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
                className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                {searchQuery.trim()} <span className="text-charcoal/30">— artist</span>
              </Link>
              <Link
                to={`/song/${encodeURIComponent(searchQuery.trim().toLowerCase())}`}
                onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
                className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                "{searchQuery.trim()}" <span className="text-charcoal/30">— song</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 -ml-2 text-charcoal/30 hover:text-charcoal/60 transition-colors"
            aria-label="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>

          {/* Time range pills */}
          <div className="flex items-center gap-1 flex-1">
            {TIME_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`px-2 py-1 text-xs transition-colors ${
                  timeRange === key
                    ? 'text-charcoal/60'
                    : 'text-charcoal/25 hover:text-charcoal/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-charcoal/30 text-sm">Loading...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : displayedLyrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p
            className="text-xl mb-2"
            style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
          >
            {searchQuery ? 'No matches' : hasActiveTagFilter ? 'No lyrics for these moods' : timeRange !== 'all' ? 'Nothing recent' : 'Nothing to explore yet'}
          </p>
          <p className="text-sm text-charcoal/30">
            {searchQuery ? 'Try a different search' : hasActiveTagFilter ? 'Try selecting different moods' : timeRange !== 'all' ? 'Try expanding the time range' : 'Lyrics shared publicly will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleLyrics.map((lyric) => (
            <LyricCard
              key={lyric.id}
              lyric={lyric}
              showTimestamp
              linkable
              compact
              className="border border-charcoal/10"
              showActions
              isAnon={isAnon}
              isOwn={user?.id === lyric.user_id}
              isPublic={lyric.is_public}
            />
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
