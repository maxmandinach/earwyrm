import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { useFollow } from '../contexts/FollowContext'
import LyricCard from '../components/LyricCard'
import ResonateButton from '../components/ResonateButton'
import CommentSection from '../components/CommentSection'

export default function SongPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { isFollowing, follow, unfollow } = useFollow()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({}) // lyric_id -> note[]
  const [loading, setLoading] = useState(true)
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)

  const songTitle = decodeURIComponent(slug)
  const artistHint = searchParams.get('artist')
  const currentlyFollowing = isFollowing('song', songTitle)

  // Derive artist name from first lyric if not in query param
  const artistName = artistHint || (lyrics.length > 0 ? lyrics[0].artist_name : null)

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

  // Group lyrics by canonical_lyric_id
  const clusters = {}
  lyrics.forEach(l => {
    const key = l.canonical_lyric_id || l.id
    if (!clusters[key]) clusters[key] = []
    clusters[key].push(l)
  })
  const clusterEntries = Object.entries(clusters)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-charcoal-light text-sm">Loading...</p>
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
              className="text-charcoal-light hover:text-charcoal transition-colors text-sm mb-4 inline-block"
            >
              ← {artistName}
            </Link>
          )}
          <div className="flex items-center gap-3 mb-2">
            <h1
              className="text-2xl text-charcoal"
              style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
            >
              "{songTitle}"
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
          {artistName && (
            <p className="text-sm text-charcoal/50 mb-1">
              <Link
                to={`/artist/${encodeURIComponent(artistName.toLowerCase())}`}
                className="hover:text-charcoal transition-colors"
              >
                {artistName}
              </Link>
            </p>
          )}
          <p className="text-xs text-charcoal/30">
            {lyrics.length} {lyrics.length === 1 ? 'lyric' : 'lyrics'} shared
          </p>
        </div>

        {/* Lyric clusters */}
        {lyrics.length === 0 ? (
          <div className="text-center py-12">
            <p
              className="text-xl mb-2"
              style={{ fontFamily: "'Caveat', cursive", color: '#6B635A' }}
            >
              No one has shared from this song yet
            </p>
            <p className="text-sm text-charcoal-light">
              Be the first to share a lyric
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {clusterEntries.map(([clusterId, clusterLyrics]) => {
              // Use the first lyric as the canonical display
              const canonical = clusterLyrics[0]
              const allNotes = clusterLyrics.flatMap(l => notes[l.id] || [])

              return (
                <div key={clusterId} className="space-y-4">
                  <LyricCard
                    lyric={canonical}
                    showTimestamp
                    linkable
                    className="border border-charcoal/10"
                  />

                  {/* All public notes from all users */}
                  {allNotes.length > 0 && (
                    <div className="space-y-3 pl-2">
                      {allNotes.map((note) => (
                        <div
                          key={note.id}
                          className="pl-4 border-l-2 border-charcoal/10"
                          style={{ transform: 'rotate(-0.5deg)', transformOrigin: 'left top' }}
                        >
                          <p
                            className="text-charcoal/50 leading-relaxed"
                            style={{ fontFamily: "'Caveat', cursive", fontSize: '1.25rem' }}
                          >
                            {note.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {note.profiles?.username && (
                              <Link
                                to={`/@${note.profiles.username}`}
                                className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
                              >
                                @{note.profiles.username}
                              </Link>
                            )}
                            {note.note_types && note.note_types.length > 0 && (
                              <div className="flex gap-1">
                                {note.note_types.map(t => (
                                  <span key={t} className="text-xs text-charcoal/25 border border-charcoal/10 px-1.5 py-0.5">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 max-w-lg mx-auto">
                    <ResonateButton lyricId={canonical.id} initialCount={canonical.reaction_count || 0} />
                    <CommentSection lyricId={canonical.id} initialCount={canonical.comment_count || 0} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
