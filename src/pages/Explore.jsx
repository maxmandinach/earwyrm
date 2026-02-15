import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useFollow } from '../contexts/FollowContext'
import { useAuth } from '../contexts/AuthContext'
import LyricCard from '../components/LyricCard'
import SharePageButton from '../components/SharePageButton'
import ExploreSearchInput from '../components/ExploreSearchInput'
import SortDropdown from '../components/SortDropdown'
import ExploreForYou from '../components/ExploreForYou'
import ExploreFollowing from '../components/ExploreFollowing'


export default function Explore() {
  const { filterType, filterValue } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { isFollowing, follow, unfollow, follows } = useFollow()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)
  const [sortBy, setSortBy] = useState('newest')

  const tab = searchParams.get('tab') || 'foryou'
  const showTabs = !filterType && !!user

  const decodedFilterValue = filterValue ? decodeURIComponent(filterValue) : null
  const songArtist = filterType === 'song' && lyrics.length > 0 ? lyrics[0].artist_name : null

  const currentlyFollowing = filterType && decodedFilterValue
    ? isFollowing(filterType, decodedFilterValue)
    : false

  function setTab(newTab) {
    setSearchParams({ tab: newTab }, { replace: true })
  }

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

  // Fetch lyrics only for filtered views
  useEffect(() => {
    if (!filterType) return

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

  // Filtered view (tag/artist/song) — early return, no tabs
  if (filterType) {
    const getTitle = () => {
      if (filterType === 'tag') return `#${decodedFilterValue}`
      if (filterType === 'artist') return decodedFilterValue
      if (filterType === 'song') {
        return songArtist
          ? `"${decodedFilterValue}" — ${songArtist}`
          : `"${decodedFilterValue}"`
      }
      return 'explore'
    }

    let displayedLyrics = searchQuery.trim()
      ? lyrics.filter(l =>
          l.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.artist_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : lyrics

    const isAnon = !user

    return (
      <div className="flex-1 flex flex-col px-4 py-8">
        <div className="max-w-lg mx-auto w-full mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link
                to="/explore"
                className="text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase">
                {getTitle()}
              </h1>

              <SharePageButton title={`${getTitle()} on earwyrm`} />

              {user && (
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

          <p className="text-xs text-charcoal/30 mb-4">
            {lyrics.length} {lyrics.length === 1 ? 'lyric' : 'lyrics'} shared
            {filterType === 'artist' && (
              <> · <Link to={`/artist/${encodeURIComponent(decodedFilterValue.toLowerCase())}`} className="underline hover:text-charcoal/50">View artist page</Link></>
            )}
            {filterType === 'song' && (
              <> · <Link to={`/song/${encodeURIComponent(decodedFilterValue.toLowerCase())}`} className="underline hover:text-charcoal/50">View song page</Link></>
            )}
          </p>

          {/* Search + Sort row */}
          <div className="flex items-center gap-3 mb-4">
            <ExploreSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search lyrics, songs, artists, tags..."
              className="flex-1"
            />
            <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
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
              style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
            >
              {searchQuery ? 'No matches' : 'No lyrics here yet'}
            </p>
            <p className="text-sm text-charcoal/30">
              {searchQuery ? 'Try a different search' : 'Be the first to share one'}
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-lg mx-auto w-full">
            {(() => {
              if (filterType === 'song' || filterType === 'artist') {
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

  // Main explore page — tab shell
  return (
    <div className="flex-1 flex flex-col px-4 py-8">
      <div className="max-w-lg mx-auto w-full">
        <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase mb-3">
          explore
        </h1>

        {/* Tab bar — only for logged-in users */}
        {showTabs && (
          <div className="flex justify-center gap-6 mb-6 border-b border-charcoal/10">
            <button
              onClick={() => setTab('foryou')}
              className={`pb-2 text-sm transition-colors relative ${
                tab === 'foryou'
                  ? 'text-charcoal/70'
                  : 'text-charcoal/30 hover:text-charcoal/50'
              }`}
            >
              for you
              {tab === 'foryou' && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-charcoal/40" />
              )}
            </button>
            <button
              onClick={() => setTab('following')}
              className={`pb-2 text-sm transition-colors relative ${
                tab === 'following'
                  ? 'text-charcoal/70'
                  : 'text-charcoal/30 hover:text-charcoal/50'
              }`}
            >
              following
              {tab === 'following' && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-charcoal/40" />
              )}
            </button>
          </div>
        )}

        {/* Tab content */}
        {showTabs && tab === 'following' ? (
          <ExploreFollowing />
        ) : (
          <ExploreForYou />
        )}
      </div>
    </div>
  )
}
