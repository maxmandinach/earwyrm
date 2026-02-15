import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { useFollow } from '../contexts/FollowContext'
import { searchArtistImage } from '../lib/genius'
import LyricCard from '../components/LyricCard'
import SharePageButton from '../components/SharePageButton'
import ExploreSearchInput from '../components/ExploreSearchInput'
import SortDropdown from '../components/SortDropdown'

export default function ArtistPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { isFollowing, follow, unfollow } = useFollow()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [artistImage, setArtistImage] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const searchContainerRef = useRef(null)
  const PAGE_SIZE = 20

  const artistName = decodeURIComponent(slug)
  const currentlyFollowing = isFollowing('artist', artistName)

  // Get unique users count
  const uniqueUsers = new Set(lyrics.map(l => l.user_id)).size

  // Aggregate stats
  const totalResonances = lyrics.reduce((sum, l) => sum + (l.reaction_count || 0), 0)
  const totalComments = lyrics.reduce((sum, l) => sum + (l.comment_count || 0), 0)

  // Get unique album covers from lyrics
  const albumCovers = useMemo(() => {
    const seen = new Set()
    return lyrics
      .filter(l => l.cover_art_url && !seen.has(l.cover_art_url) && seen.add(l.cover_art_url))
      .map(l => l.cover_art_url)
      .slice(0, 5)
  }, [lyrics])

  // Get unique songs
  const songMap = {}
  lyrics.forEach(l => {
    if (l.song_title) {
      const key = l.song_title.toLowerCase()
      if (!songMap[key]) songMap[key] = { title: l.song_title, count: 0 }
      songMap[key].count++
    }
  })
  const songs = Object.values(songMap).sort((a, b) => b.count - a.count)

  async function handleToggleFollow() {
    if (!user || isTogglingFollow) return
    setIsTogglingFollow(true)
    try {
      if (currentlyFollowing) {
        await unfollow('artist', artistName)
      } else {
        await follow('artist', artistName)
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

  // Fetch artist image from Genius
  useEffect(() => {
    searchArtistImage(artistName).then(url => {
      if (url) setArtistImage(url)
    })
  }, [artistName])

  useEffect(() => {
    async function fetchLyrics() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .ilike('artist_name', artistName)
          .order('created_at', { ascending: false })
          .range(0, 49)

        if (error) throw error
        setLyrics(data || [])
        setHasMore((data || []).length > 49)

        // Fetch notes
        if (data && data.length > 0) {
          const lyricIds = data.map(l => l.id)
          const { data: notesData } = await supabase
            .from('lyric_notes')
            .select('*')
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
        console.error('Error fetching artist lyrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLyrics()
  }, [artistName])

  async function loadMore() {
    const nextPage = page + 1
    const from = 50 + (nextPage - 1) * PAGE_SIZE
    try {
      const { data } = await supabase
        .from('lyrics')
        .select('*')
        .eq('is_public', true)
        .ilike('artist_name', artistName)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE)

      if (data) {
        setLyrics(prev => [...prev, ...data])
        setHasMore(data.length > PAGE_SIZE)
        setPage(nextPage)

        // Fetch notes for new lyrics
        if (data.length > 0) {
          const lyricIds = data.map(l => l.id)
          const { data: notesData } = await supabase
            .from('lyric_notes')
            .select('*')
            .in('lyric_id', lyricIds)
            .eq('is_public', true)

          if (notesData) {
            setNotes(prev => {
              const updated = { ...prev }
              notesData.forEach(n => {
                if (!updated[n.lyric_id]) updated[n.lyric_id] = []
                updated[n.lyric_id].push(n)
              })
              return updated
            })
          }
        }
      }
    } catch (err) {
      console.error('Error loading more:', err)
    }
  }

  // Cluster lyrics by canonical_lyric_id
  const { topClusters, recentClusters } = useMemo(() => {
    const map = {}
    lyrics.forEach(l => {
      const key = l.canonical_lyric_id || l.id
      if (!map[key]) map[key] = []
      map[key].push(l)
    })

    const all = Object.entries(map).map(([id, group]) => {
      const representative = group.reduce((best, l) =>
        (l.reaction_count || 0) > (best.reaction_count || 0) ? l : best
      , group[0])
      const totalReactions = group.reduce((sum, l) => sum + (l.reaction_count || 0), 0)
      const mostRecent = group.reduce((latest, l) =>
        new Date(l.created_at) > new Date(latest.created_at) ? l : latest
      , group[0])
      return { id, group, representative, saveCount: group.length, totalReactions, mostRecent }
    })

    const topClusters = [...all].sort((a, b) => b.saveCount - a.saveCount)
    const recentClusters = [...all].sort((a, b) =>
      new Date(b.mostRecent.created_at) - new Date(a.mostRecent.created_at)
    )

    return { topClusters, recentClusters }
  }, [lyrics])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-charcoal/30 text-sm">Loading...</p>
      </div>
    )
  }

  const isAnon = !user
  const mostSavedClusters = topClusters.filter(c => c.saveCount > 1).slice(0, 3)

  return (
    <div className="flex-1 flex flex-col px-4 py-8">
      <div className="max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/explore"
            className="text-charcoal/40 hover:text-charcoal transition-colors text-sm mb-4 inline-block"
          >
            ← Explore
          </Link>
          <div className="flex items-center gap-3 mb-2">
            {artistImage && (
              <img
                src={artistImage}
                alt={artistName}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase">
              {artistName}
            </h1>
            {user && (
              <div className="flex flex-col items-start">
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
            <SharePageButton title={`${artistName} lyrics on earwyrm`} />
          </div>

          {/* Album covers row */}
          {albumCovers.length > 0 && (
            <div className="flex gap-1.5 mb-2">
              {albumCovers.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-8 h-8 rounded-sm object-cover"
                />
              ))}
            </div>
          )}

          {/* Aggregate stats */}
          <p className="text-xs text-charcoal/30">
            {lyrics.length} {lyrics.length === 1 ? 'lyric' : 'lyrics'}
            {uniqueUsers > 1 ? ` · ${uniqueUsers} people` : ''}
            {totalResonances > 0 ? ` · ${totalResonances} resonance${totalResonances === 1 ? '' : 's'}` : ''}
            {totalComments > 0 ? ` · ${totalComments} comment${totalComments === 1 ? '' : 's'}` : ''}
          </p>
        </div>

        {/* Songs section */}
        {songs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-light text-charcoal/40 lowercase tracking-wide mb-3">Songs</h2>
            <div className="space-y-1">
              {songs.map((song) => (
                <Link
                  key={song.title}
                  to={`/song/${encodeURIComponent(song.title.toLowerCase())}?artist=${encodeURIComponent(artistName)}`}
                  className="flex items-center justify-between px-3 py-2 hover:bg-charcoal/5 transition-colors"
                >
                  <span className="text-sm text-charcoal/70">"{song.title}"</span>
                  <span className="text-xs text-charcoal/30">{song.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Most Saved Lines section */}
        {mostSavedClusters.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-light text-charcoal/40 lowercase tracking-wide mb-3">Most saved lines</h2>
            <div className="space-y-4">
              {mostSavedClusters.map((cluster) => (
                <div key={cluster.id}>
                  <LyricCard
                    lyric={{ ...cluster.representative, reaction_count: cluster.totalReactions }}
                    showTimestamp
                    linkable
                    className="border border-charcoal/10"
                    showActions
                    isAnon={isAnon}
                    isOwn={user?.id === cluster.representative.user_id}
                    isPublic={cluster.representative.is_public}
                    notes={notes[cluster.representative.id]}
                  />
                  <p className="text-xs text-charcoal/30 mt-1">
                    {cluster.saveCount} people saved this
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Saves */}
        {lyrics.length === 0 ? (
          <div className="text-center py-12">
            <p
              className="text-xl mb-2"
              style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
            >
              No lyrics here yet
            </p>
            <p className="text-sm text-charcoal/30">
              Be the first to share a {artistName} lyric
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-light text-charcoal/40 lowercase tracking-wide mb-3">Recent saves</h2>

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
              let filtered = recentClusters
              // Apply sort
              if (sortBy === 'resonated') {
                filtered = [...filtered].sort((a, b) => b.totalReactions - a.totalReactions)
              } else if (sortBy === 'discussed') {
                filtered = [...filtered].sort((a, b) =>
                  (b.representative.comment_count || 0) - (a.representative.comment_count || 0)
                )
              }
              // Apply search
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                filtered = filtered.filter(c =>
                  c.representative.content.toLowerCase().includes(q) ||
                  c.representative.song_title?.toLowerCase().includes(q)
                )
              }
              return (
                <div className="space-y-4">
                  {filtered.map((cluster) => (
                    <div key={cluster.id}>
                      <LyricCard
                        lyric={{ ...cluster.representative, reaction_count: cluster.totalReactions }}
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

            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
