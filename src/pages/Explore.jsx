import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useFollow } from '../contexts/FollowContext'
import { useAuth } from '../contexts/AuthContext'
import LyricCard from '../components/LyricCard'
import SharePageButton from '../components/SharePageButton'


export default function Explore() {
  const { filterType, filterValue } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { isFollowing, follow, unfollow, follows } = useFollow()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)
  const [trendingTags, setTrendingTags] = useState([])
  const [sortBy, setSortBy] = useState('newest')
  const [scope, setScope] = useState('all')

  const decodedFilterValue = filterValue ? decodeURIComponent(filterValue) : null
  const songArtist = filterType === 'song' && lyrics.length > 0 ? lyrics[0].artist_name : null

  const currentlyFollowing = filterType && decodedFilterValue
    ? isFollowing(filterType, decodedFilterValue)
    : false

  // Determine if scope toggle should show
  const showScopeToggle = !filterType && user && follows.length > 0

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

  // Fetch real trending tags
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

  useEffect(() => {
    async function fetchLyrics() {
      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .limit(50)

        if (filterType === 'tag' && decodedFilterValue) {
          query = query.contains('tags', [decodedFilterValue])
        } else if (filterType === 'artist' && decodedFilterValue) {
          query = query.ilike('artist_name', decodedFilterValue)
        } else if (filterType === 'song' && decodedFilterValue) {
          query = query.ilike('song_title', decodedFilterValue)
        }

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
  }, [filterType, decodedFilterValue, sortBy])

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

  // Apply search filter
  let displayedLyrics = searchQuery.trim()
    ? lyrics.filter(l =>
        l.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.artist_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : lyrics

  // Apply scope filter (my follows)
  if (scope === 'follows' && !filterType) {
    const artistFollows = follows.filter(f => f.filter_type === 'artist').map(f => f.filter_value)
    const songFollows = follows.filter(f => f.filter_type === 'song').map(f => f.filter_value)
    const tagFollows = follows.filter(f => f.filter_type === 'tag').map(f => f.filter_value)

    displayedLyrics = displayedLyrics.filter(l => {
      if (artistFollows.some(a => l.artist_name?.toLowerCase() === a.toLowerCase())) return true
      if (songFollows.some(s => l.song_title?.toLowerCase() === s.toLowerCase())) return true
      if (tagFollows.some(t => l.tags?.some(lt => lt.toLowerCase() === t.toLowerCase()))) return true
      return false
    })
  }

  const isAnon = !user

  return (
    <div className="flex-1 flex flex-col px-4 py-8">
      {/* Header */}
      <div className="max-w-lg mx-auto w-full mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {filterType && (
              <Link
                to="/explore"
                className="text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase">
              {getTitle()}
            </h1>

            {filterType && (
              <SharePageButton title={`${getTitle()} on earwyrm`} />
            )}

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
        </div>

        {filterType && (
          <p className="text-xs text-charcoal/30 mb-4">
            {lyrics.length} {lyrics.length === 1 ? 'lyric' : 'lyrics'} shared
            {filterType === 'artist' && (
              <> · <Link to={`/artist/${encodeURIComponent(decodedFilterValue.toLowerCase())}`} className="underline hover:text-charcoal/50">View artist page</Link></>
            )}
            {filterType === 'song' && (
              <> · <Link to={`/song/${encodeURIComponent(decodedFilterValue.toLowerCase())}`} className="underline hover:text-charcoal/50">View song page</Link></>
            )}
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
                to={`/artist/${encodeURIComponent(searchQuery.trim().toLowerCase())}`}
                onClick={() => setSearchQuery('')}
                className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                {searchQuery.trim()} <span className="text-charcoal/30">— artist</span>
              </Link>
              <Link
                to={`/song/${encodeURIComponent(searchQuery.trim().toLowerCase())}`}
                onClick={() => setSearchQuery('')}
                className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                "{searchQuery.trim()}" <span className="text-charcoal/30">— song</span>
              </Link>
            </div>
          )}
        </div>

        {/* Scope toggle — only on main explore for logged-in users with follows */}
        {showScopeToggle && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-charcoal/30">show:</span>
            {[
              { key: 'all', label: 'all' },
              { key: 'follows', label: 'my follows' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={`px-3 py-1 text-xs border transition-colors ${
                  scope === key
                    ? 'border-charcoal/40 text-charcoal/70'
                    : 'border-charcoal/10 text-charcoal/30 hover:border-charcoal/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Moods / trending tags - only show on main explore page */}
        {!filterType && trendingTags.length > 0 && (
          <div className="mb-4">
            <p
              className="text-charcoal/40 lowercase mb-2"
              style={{ fontFamily: "'Caveat', cursive", fontSize: '1.1rem' }}
            >
              moods
            </p>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  to={`/explore/tag/${encodeURIComponent(tag)}`}
                  className="px-3 py-2 text-xs border border-charcoal/10 text-charcoal/50
                           hover:border-charcoal/30 hover:text-charcoal/70 transition-colors"
                >
                  #{tag}
                  {count > 0 && (
                    <span className="ml-1 text-charcoal/20 text-[10px]">{count}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sort pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-charcoal/30">sort by:</span>
          {[
            { key: 'newest', label: 'newest' },
            { key: 'resonated', label: 'most resonated' },
            { key: 'discussed', label: 'most discussed' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1 text-xs border transition-colors ${
                sortBy === key
                  ? 'border-charcoal/40 text-charcoal/70'
                  : 'border-charcoal/10 text-charcoal/30 hover:border-charcoal/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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
            style={{
              fontFamily: "'Caveat', cursive",
              color: 'var(--text-secondary, #6B635A)',
            }}
          >
            {searchQuery ? 'No matches' : scope === 'follows' ? 'Nothing from your follows yet' : filterType ? 'No lyrics here yet' : 'Nothing to explore yet'}
          </p>
          <p className="text-sm text-charcoal/30">
            {searchQuery
              ? 'Try a different search'
              : scope === 'follows'
              ? 'Switch to "all" or follow more artists and tags'
              : filterType
              ? 'Be the first to share one'
              : 'Lyrics shared publicly will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-lg mx-auto w-full">
          {(() => {
            // Cluster by canonical in filtered views; flat in unfiltered
            if (filterType && (filterType === 'song' || filterType === 'artist')) {
              const clusters = {}
              displayedLyrics.forEach(l => {
                const key = l.canonical_lyric_id || l.id
                if (!clusters[key]) clusters[key] = []
                clusters[key].push(l)
              })
              return Object.entries(clusters).map(([key, group]) => {
                const representative = group.reduce((best, l) =>
                  (l.reaction_count || 0) > (best.reaction_count || 0) ? l : best
                , group[0])
                const totalReactions = group.reduce((sum, l) => sum + (l.reaction_count || 0), 0)
                return (
                  <div key={key}>
                    <LyricCard
                      lyric={{ ...representative, reaction_count: totalReactions }}
                      showTimestamp
                      linkable
                      className="border border-charcoal/10"
                      showActions
                      isAnon={isAnon}
                      isOwn={user?.id === representative.user_id}
                      isPublic={representative.is_public}
                      notes={notes[representative.id]}
                    />
                    {group.length > 1 && (
                      <p className="text-xs text-charcoal/30 mt-1 max-w-lg mx-auto">
                        {group.length} people saved this
                      </p>
                    )}
                  </div>
                )
              })
            }

            // Flat rendering for unfiltered/tag views
            return displayedLyrics.map((lyric) => (
              <LyricCard
                key={lyric.id}
                lyric={lyric}
                showTimestamp
                linkable
                className="border border-charcoal/10"
                showActions
                isAnon={isAnon}
                isOwn={user?.id === lyric.user_id}
                isPublic={lyric.is_public}
                notes={notes[lyric.id]}
              />
            ))
          })()}
        </div>
      )}
    </div>
  )
}
