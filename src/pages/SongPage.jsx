import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { useFollow } from '../contexts/FollowContext'
import { searchByArtistAndSongWithCoverArt } from '../lib/musicbrainz'
import LyricCard from '../components/LyricCard'
import SharePageButton from '../components/SharePageButton'
import HorizontalCardCarousel from '../components/HorizontalCardCarousel'
import ExploreSearchInput from '../components/ExploreSearchInput'
import SortDropdown from '../components/SortDropdown'

export default function SongPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { isFollowing, follow, unfollow } = useFollow()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({}) // lyric_id -> note[]
  const [loading, setLoading] = useState(true)
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)
  const [moreSongs, setMoreSongs] = useState([])
  const [coverArt, setCoverArt] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const searchContainerRef = useRef(null)

  const songTitle = decodeURIComponent(slug)
  const artistHint = searchParams.get('artist')
  const currentlyFollowing = isFollowing('song', songTitle)

  // Derive artist name from first lyric if not in query param
  const artistName = artistHint || (lyrics.length > 0 ? lyrics[0].artist_name : null)

  // Album name from first lyric that has one
  const albumName = useMemo(() => {
    const withAlbum = lyrics.find(l => l.album_name)
    return withAlbum?.album_name || null
  }, [lyrics])

  // Aggregate stats
  const totalResonances = lyrics.reduce((sum, l) => sum + (l.reaction_count || 0), 0)
  const totalComments = lyrics.reduce((sum, l) => sum + (l.comment_count || 0), 0)
  const uniqueUsers = new Set(lyrics.map(l => l.user_id)).size

  async function handleToggleFollow() {
    if (!user || isTogglingFollow) return
    setIsTogglingFollow(true)
    try {
      if (currentlyFollowing) {
        await unfollow('song', songTitle)
      } else {
        await follow('song', songTitle)
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
    } finally {
      setIsTogglingFollow(false)
    }
  }

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

  useEffect(() => {
    async function fetchLyrics() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .ilike('song_title', songTitle)
          .order('reaction_count', { ascending: false })
          .limit(50)

        if (error) throw error
        setLyrics(data || [])

        // Extract cover art from first lyric that has one
        const withCover = (data || []).find(l => l.cover_art_url)
        if (withCover) {
          setCoverArt(withCover.cover_art_url)
        }

        // Fetch all public notes for these lyrics
        if (data && data.length > 0) {
          const lyricIds = data.map(l => l.id)
          const { data: notesData } = await supabase
            .from('lyric_notes')
            .select('*, profiles:user_id(username)')
            .in('lyric_id', lyricIds)
            .eq('is_public', true)

          if (notesData) {
            const map = {}
            notesData.forEach(n => {
              if (!map[n.lyric_id]) map[n.lyric_id] = []
              map[n.lyric_id].push(n)
            })
            setNotes(map)
          }
        }
      } catch (err) {
        console.error('Error fetching song lyrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLyrics()
  }, [songTitle])

  // Fallback: fetch cover art from MusicBrainz if none in lyrics
  useEffect(() => {
    if (coverArt || loading || !artistName) return
    searchByArtistAndSongWithCoverArt(artistName, songTitle, 1).then(results => {
      const art = results?.[0]?.coverArtUrl
      if (art) setCoverArt(art)
    })
  }, [coverArt, loading, artistName, songTitle])

  // Fetch "More from Artist" carousel
  useEffect(() => {
    if (!artistName) return
    async function fetchMoreFromArtist() {
      try {
        const { data } = await supabase
          .from('lyrics')
          .select('*, profiles:user_id(username)')
          .eq('is_public', true)
          .ilike('artist_name', artistName)
          .neq('song_title', songTitle)
          .order('reaction_count', { ascending: false })
          .limit(50)

        if (data && data.length > 0) {
          // Deduplicate by song_title — keep top lyric per song
          const seen = {}
          const deduped = []
          for (const l of data) {
            const key = (l.song_title || '').toLowerCase()
            if (!seen[key]) {
              seen[key] = true
              deduped.push(l)
              if (deduped.length >= 8) break
            }
          }
          setMoreSongs(deduped)
        } else {
          setMoreSongs([])
        }
      } catch (err) {
        console.error('Error fetching more from artist:', err)
      }
    }
    fetchMoreFromArtist()
  }, [artistName, songTitle])

  // Group lyrics by canonical_lyric_id, sorted by save count descending
  const clusters = useMemo(() => {
    const map = {}
    lyrics.forEach(l => {
      const key = l.canonical_lyric_id || l.id
      if (!map[key]) map[key] = []
      map[key].push(l)
    })
    return Object.entries(map)
      .map(([id, group]) => {
        const representative = group.reduce((best, l) =>
          (l.reaction_count || 0) > (best.reaction_count || 0) ? l : best
        , group[0])
        const allNotes = group.flatMap(l => notes[l.id] || [])
        return { id, group, representative, saveCount: group.length, allNotes }
      })
      .sort((a, b) => b.saveCount - a.saveCount)
  }, [lyrics, notes])

  const topCluster = clusters.length > 0 ? clusters[0] : null
  const isAnon = !user

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-charcoal/30 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-8">
      <div className="max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          {artistName && (
            <Link
              to={`/artist/${encodeURIComponent(artistName.toLowerCase())}`}
              className="text-charcoal/40 hover:text-charcoal transition-colors text-sm mb-4 inline-block"
            >
              ← {artistName}
            </Link>
          )}
          <div className="flex items-center gap-3 mb-2">
            {coverArt && (
              <img
                src={coverArt}
                alt={songTitle}
                className="w-16 h-16 rounded object-cover shadow-sm"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase">
                "{songTitle}"
              </h1>
              {artistName && (
                <p className="text-sm text-charcoal/50">
                  <Link
                    to={`/artist/${encodeURIComponent(artistName.toLowerCase())}`}
                    className="hover:text-charcoal transition-colors"
                  >
                    {artistName}
                  </Link>
                </p>
              )}
              {albumName && (
                <p className="text-xs text-charcoal/30 italic">from {albumName}</p>
              )}
            </div>
            {user && (
              <div className="flex flex-col items-start shrink-0">
                <button
                  onClick={handleToggleFollow}
                  disabled={isTogglingFollow}
                  className={`px-3 py-1 text-xs border rounded-full transition-colors ${
                    currentlyFollowing
                      ? 'border-charcoal/30 text-charcoal/50 hover:border-charcoal/50'
                      : 'border-charcoal/20 text-charcoal/40 hover:border-charcoal/40 hover:text-charcoal/60'
                  }`}
                >
                  {currentlyFollowing ? 'following' : 'follow'}
                </button>
                {!currentlyFollowing && (
                  <span className="text-[10px] text-charcoal/20 mt-0.5">new lyrics appear in your feed</span>
                )}
              </div>
            )}
            <SharePageButton title={`"${songTitle}" lyrics on earwyrm`} />
          </div>
          {/* Aggregate stats */}
          <p className="text-xs text-charcoal/30">
            {lyrics.length} {lyrics.length === 1 ? 'lyric' : 'lyrics'} shared
            {uniqueUsers > 1 ? ` · ${uniqueUsers} people` : ''}
            {totalResonances > 0 ? ` · ${totalResonances} resonance${totalResonances === 1 ? '' : 's'}` : ''}
            {totalComments > 0 ? ` · ${totalComments} comment${totalComments === 1 ? '' : 's'}` : ''}
          </p>
        </div>

        {/* Most Saved Line callout */}
        {topCluster && topCluster.saveCount > 1 && (
          <div className="mb-8">
            <h2 className="text-sm font-light text-charcoal/40 lowercase tracking-wide mb-3">Most saved line</h2>
            <LyricCard
              lyric={topCluster.representative}
              hero
              showTimestamp
              linkable
              className="border border-charcoal/10"
              showActions
              isAnon={isAnon}
              isOwn={user?.id === topCluster.representative.user_id}
              isPublic={topCluster.representative.is_public}
              notes={topCluster.allNotes.length > 0 ? topCluster.allNotes : undefined}
            />
            <p className="text-xs text-charcoal/30 mt-1">
              saved by {topCluster.saveCount} people
            </p>
          </div>
        )}

        {/* All lyrics — clustered by canonical, sorted by save count */}
        {lyrics.length === 0 ? (
          <div className="text-center py-12">
            <p
              className="text-xl mb-2"
              style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
            >
              No one has shared from this song yet
            </p>
            <p className="text-sm text-charcoal/30">
              Be the first to share a lyric
            </p>
          </div>
        ) : (
          <>
            {/* Search + Sort toolbar */}
            {searchOpen ? (
              <div ref={searchContainerRef} className="relative mb-4">
                <ExploreSearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  placeholder="Search lyrics..."
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
                <div className="flex-1" />
                <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
              </div>
            )}

            {(() => {
              let filtered = clusters
              // Apply sort
              if (sortBy === 'newest') {
                filtered = [...filtered].sort((a, b) =>
                  new Date(b.representative.created_at) - new Date(a.representative.created_at)
                )
              } else if (sortBy === 'resonated') {
                filtered = [...filtered].sort((a, b) =>
                  (b.representative.reaction_count || 0) - (a.representative.reaction_count || 0)
                )
              } else if (sortBy === 'discussed') {
                filtered = [...filtered].sort((a, b) =>
                  (b.representative.comment_count || 0) - (a.representative.comment_count || 0)
                )
              }
              // Apply search
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                filtered = filtered.filter(c =>
                  c.representative.content.toLowerCase().includes(q)
                )
              }
              return (
                <div className="space-y-4">
                  {filtered.map((cluster) => (
                    <div key={cluster.id}>
                      <LyricCard
                        lyric={cluster.representative}
                        showTimestamp
                        linkable
                        compact
                        className="border border-charcoal/10"
                        showActions
                        isAnon={isAnon}
                        isOwn={user?.id === cluster.representative.user_id}
                        isPublic={cluster.representative.is_public}
                      />
                      {cluster.saveCount > 1 && (
                        <p className="text-xs text-charcoal/30 mt-1">
                          {cluster.saveCount} people saved this
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}
          </>
        )}

        {/* More from [Artist] */}
        {moreSongs.length > 0 && (
          <div className="mt-10">
            <HorizontalCardCarousel
              title={`More from ${artistName}`}
              lyrics={moreSongs}
              linkTo={`/artist/${encodeURIComponent((artistName || '').toLowerCase())}`}
              linkLabel="See all →"
            />
          </div>
        )}
      </div>
    </div>
  )
}
