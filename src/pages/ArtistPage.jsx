import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { useFollow } from '../contexts/FollowContext'
import LyricCard from '../components/LyricCard'

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
  const PAGE_SIZE = 20

  const artistName = decodeURIComponent(slug)
  const currentlyFollowing = isFollowing('artist', artistName)

  // Get unique users count
  const uniqueUsers = new Set(lyrics.map(l => l.user_id)).size

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
          .range(0, PAGE_SIZE)

        if (error) throw error
        setLyrics(data || [])
        setHasMore((data || []).length > PAGE_SIZE)

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
    const from = nextPage * PAGE_SIZE
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-charcoal-light text-sm">Loading...</p>
      </div>
    )
  }

  const isAnon = !user

  return (
    <div className="flex-1 flex flex-col px-4 py-8">
      <div className="max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/explore"
            className="text-charcoal-light hover:text-charcoal transition-colors text-sm mb-4 inline-block"
          >
            ← Explore
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <h1
              className="text-3xl text-charcoal"
              style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
            >
              {artistName}
            </h1>
            {user && (
              <button
                onClick={handleToggleFollow}
                disabled={isTogglingFollow}
                className={`px-3 py-1 text-xs border transition-colors ${
                  currentlyFollowing
                    ? 'border-charcoal/30 text-charcoal/50 hover:border-charcoal/50'
                    : 'border-charcoal/20 text-charcoal/40 hover:border-charcoal/40 hover:text-charcoal/60'
                }`}
              >
                {currentlyFollowing ? 'following' : 'follow'}
              </button>
            )}
          </div>
          <p className="text-xs text-charcoal/30">
            {lyrics.length} {lyrics.length === 1 ? 'lyric' : 'lyrics'} shared
            {uniqueUsers > 1 ? ` by ${uniqueUsers} people` : ''}
          </p>
        </div>

        {/* Songs section */}
        {songs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-3">Songs</h2>
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

        {/* All lyrics — clustered by canonical */}
        {lyrics.length === 0 ? (
          <div className="text-center py-12">
            <p
              className="text-xl mb-2"
              style={{ fontFamily: "'Caveat', cursive", color: '#6B635A' }}
            >
              No lyrics here yet
            </p>
            <p className="text-sm text-charcoal-light">
              Be the first to share a {artistName} lyric
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              const clusters = {}
              lyrics.forEach(l => {
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
          </div>
        )}
      </div>
    </div>
  )
}
