import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useFollow } from '../contexts/FollowContext'
import { useAuth } from '../contexts/AuthContext'
import { useBlock } from '../contexts/BlockContext'
import LyricCard from './LyricCard'
import ExploreSearchInput from './ExploreSearchInput'
import SortDropdown from './SortDropdown'
import FollowFilterSheet from './FollowFilterSheet'
import ModalSheet from './ModalSheet'

const PAGE_SIZE = 20
const INLINE_THRESHOLD = 6

const TIME_OPTIONS = [
  { key: 'all', label: 'all time' },
  { key: 'week', label: 'this week' },
  { key: 'today', label: 'today' },
]

export default function ExploreFollowing() {
  const { user } = useAuth()
  const { follows, loading: followsLoading } = useFollow()
  const { isBlocked } = useBlock()
  const [allMatched, setAllMatched] = useState([])
  const [, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [timeRange, setTimeRange] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [activeFilterIds, setActiveFilterIds] = useState(null) // null = all
  const [showFilterSheet, setShowFilterSheet] = useState(false)
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

  // Fetch all followed content once
  useEffect(() => {
    if (followsLoading) return
    if (follows.length === 0) {
      setAllMatched([])
      setLoading(false)
      return
    }

    async function fetchFeed() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(100)

        if (data) {
          // Tag each lyric with which follow IDs matched it
          const matched = data.reduce((acc, l) => {
            const matchingFollowIds = follows.filter(f => {
              if (f.filter_type === 'artist') return l.artist_name?.toLowerCase() === f.filter_value.toLowerCase()
              if (f.filter_type === 'song') return l.song_title?.toLowerCase() === f.filter_value.toLowerCase()
              if (f.filter_type === 'tag') return l.tags?.some(lt => lt.toLowerCase() === f.filter_value.toLowerCase())
              return false
            }).map(f => f.id)

            if (matchingFollowIds.length > 0) {
              acc.push({ ...l, _matchingFollowIds: matchingFollowIds })
            }
            return acc
          }, [])

          setAllMatched(matched)

          if (matched.length > 0) {
            const lyricIds = matched.map(l => l.id)
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
        }
      } catch (err) {
        console.error('Error fetching feed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeed()
  }, [follows, followsLoading])

  // Derive active follows from filter IDs
  // Filter lyrics by active follows, excluding blocked users
  let displayedLyrics = (activeFilterIds === null
    ? allMatched
    : allMatched.filter(l =>
        l._matchingFollowIds.some(id => activeFilterIds.has(id))
      )
  ).filter(l => !l.user_id || !isBlocked(l.user_id))

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

  // Apply sort
  if (sortBy === 'resonated') {
    displayedLyrics = [...displayedLyrics].sort((a, b) => (b.reaction_count || 0) - (a.reaction_count || 0))
  } else if (sortBy === 'discussed') {
    displayedLyrics = [...displayedLyrics].sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0))
  }

  const visibleLyrics = displayedLyrics.slice(0, visibleCount)
  const hasMore = displayedLyrics.length > visibleCount

  const isAnon = !user

  // Filter toggle helpers
  function handleToggleFilter(id) {
    setActiveFilterIds(prev => {
      if (prev === null) {
        // From "all" → select only this one
        return new Set([id])
      }
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      // If all selected again, go back to null
      if (next.size === follows.length) return null
      return next
    })
  }

  function handleSelectAll() {
    setActiveFilterIds(null)
  }

  function handleClearAll() {
    setActiveFilterIds(new Set())
  }

  const activeCount = activeFilterIds === null ? follows.length : activeFilterIds.size
  const hasActiveFilter = activeFilterIds !== null

  // Chip display label
  function getChipLabel(f) {
    if (f.filter_type === 'tag') return `#${f.filter_value}`
    return f.filter_value
  }

  function isChipActive(f) {
    return activeFilterIds === null || activeFilterIds.has(f.id)
  }

  return (
    <>
      {/* Filter chips or summary pill */}
      {follows.length > 0 && follows.length < INLINE_THRESHOLD && (
        <div className="flex overflow-x-auto -mx-4 px-4 scrollbar-hide gap-2 mb-4">
          {follows.map(f => (
            <button
              key={f.id}
              onClick={() => handleToggleFilter(f.id)}
              className={`px-3 py-2 text-xs border rounded-full transition-colors whitespace-nowrap shrink-0 ${
                isChipActive(f)
                  ? hasActiveFilter
                    ? 'border-charcoal/40 text-charcoal/70 bg-charcoal/5'
                    : 'border-charcoal/10 text-charcoal/50 bg-transparent'
                  : 'border-charcoal/10 text-charcoal/30 bg-transparent'
              }`}
            >
              {getChipLabel(f)}
            </button>
          ))}
        </div>
      )}

      {follows.length >= INLINE_THRESHOLD && (
        <div className="mb-4">
          <button
            onClick={() => setShowFilterSheet(true)}
            className="px-3 py-2 text-xs border border-charcoal/15 text-charcoal/50
                     hover:border-charcoal/30 transition-colors rounded-full"
          >
            {activeFilterIds === null
              ? `all follows (${follows.length})`
              : `${activeCount} active`
            }
          </button>
        </div>
      )}

      {/* Filter sheet modal */}
      {showFilterSheet && (
        <ModalSheet onClose={() => setShowFilterSheet(false)} title="Filter follows">
          <FollowFilterSheet
            follows={follows}
            activeFilterIds={activeFilterIds}
            onToggleFilter={handleToggleFilter}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            onClose={() => setShowFilterSheet(false)}
          />
        </ModalSheet>
      )}

      {/* Search + Sort compact row */}
      {searchOpen ? (
        <div ref={searchContainerRef} className="relative mb-4">
          <ExploreSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search your feed..."
            autoFocus
          />
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
      {followsLoading || loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-charcoal/30 text-sm">Loading...</p>
        </div>
      ) : follows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <p
            className="text-xl mb-2"
            style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
          >
            Follow artists, songs, and tags to build your feed
          </p>
          <p className="text-sm text-charcoal/30">
            Tap follow on any artist, song, or tag page
          </p>
        </div>
      ) : displayedLyrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <p
            className="text-xl mb-2"
            style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
          >
            {searchQuery ? 'No matches' : activeCount === 0 ? 'No filters selected' : timeRange !== 'all' ? 'Nothing recent' : 'Nothing new yet'}
          </p>
          <p className="text-sm text-charcoal/30">
            {searchQuery ? 'Try a different search' : activeCount === 0 ? 'Select some follows to see their lyrics' : timeRange !== 'all' ? 'Try expanding the time range' : 'New public lyrics from your follows will appear here'}
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
