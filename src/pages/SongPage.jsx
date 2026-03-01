import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { useFollow } from '../contexts/FollowContext'
import { searchByArtistAndSongWithCoverArt } from '../lib/musicbrainz'
import { searchByLyrics } from '../lib/genius'
import LyricCard from '../components/LyricCard'
import PageShareModal from '../components/PageShareModal'
import HorizontalCardCarousel from '../components/HorizontalCardCarousel'
import ExploreSearchInput from '../components/ExploreSearchInput'
import SortDropdown from '../components/SortDropdown'
import FullLyricsTab from '../components/FullLyricsTab'
import SongBackgroundTab from '../components/SongBackgroundTab'

const TIME_OPTIONS = [
  { key: 'all', label: 'all time' },
  { key: 'week', label: 'this week' },
  { key: 'today', label: 'today' },
]

const TABS = [
  { key: 'posts', label: 'posts' },
  { key: 'lyrics', label: 'full lyrics' },
  { key: 'background', label: 'background' },
]

const MUSIC_SERVICES = {
  spotify: {
    label: 'Spotify',
    color: '#1DB954',
    url: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  apple_music: {
    label: 'Apple Music',
    color: '#FC3C44',
    url: (q) => `https://music.apple.com/search?term=${encodeURIComponent(q)}`,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
  youtube_music: {
    label: 'YouTube Music',
    color: '#FF0000',
    url: (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm-1.2 16.8V7.2L16.8 12l-6 4.8z"/>
      </svg>
    ),
  },
}

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
  const [timeRange, setTimeRange] = useState('all')
  const [showShareModal, setShowShareModal] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
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

  // Fallback: fetch cover art from MusicBrainz, then Genius
  useEffect(() => {
    if (coverArt || loading || !artistName) return
    async function fetchCoverArt() {
      // Try MusicBrainz first
      const mbResults = await searchByArtistAndSongWithCoverArt(artistName, songTitle, 1)
      const mbArt = mbResults?.[0]?.coverArtUrl
      if (mbArt) { setCoverArt(mbArt); return }
      // Fall back to Genius song art
      const geniusResults = await searchByLyrics(songTitle)
      const match = geniusResults.find(r =>
        r.artist?.toLowerCase() === artistName.toLowerCase()
      ) || geniusResults[0]
      if (match?.coverArtUrl) setCoverArt(match.coverArtUrl)
    }
    fetchCoverArt()
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
                className="w-20 h-20 rounded object-cover shadow-md"
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
            <button
              onClick={() => setShowShareModal(true)}
              className="text-charcoal/25 hover:text-charcoal/50 transition-colors p-1"
              title="Share"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          </div>
          {/* Aggregate stats */}
          <p className="text-xs text-charcoal/30">
            {lyrics.length} {lyrics.length === 1 ? 'lyric' : 'lyrics'} shared
            {uniqueUsers > 1 ? ` · ${uniqueUsers} people` : ''}
            {totalResonances > 0 ? ` · ${totalResonances} resonance${totalResonances === 1 ? '' : 's'}` : ''}
            {totalComments > 0 ? ` · ${totalComments} comment${totalComments === 1 ? '' : 's'}` : ''}
          </p>
          {artistName && (() => {
            const svc = MUSIC_SERVICES[localStorage.getItem('earwyrm-music-service') || 'spotify'] || MUSIC_SERVICES.spotify
            return (
              <a
                href={svc.url(`${artistName} ${songTitle}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 mt-2"
                style={{ backgroundColor: `${svc.color}15`, color: svc.color }}
              >
                {svc.icon}
                listen on {svc.label}
              </a>
            )
          })()}
        </div>

        {/* Tab Bar */}
        <div className="flex justify-center gap-6 mb-6 border-b border-charcoal/10">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pb-2 text-sm transition-colors relative ${
                activeTab === key
                  ? 'text-charcoal/70'
                  : 'text-charcoal/30 hover:text-charcoal/50'
              }`}
            >
              {label}
              {activeTab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-charcoal/40" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <>
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

                {(() => {
                  let filtered = clusters
                  // Apply time range
                  if (timeRange !== 'all') {
                    const now = new Date()
                    const cutoff = timeRange === 'today'
                      ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
                      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    filtered = filtered.filter(c =>
                      new Date(c.representative.created_at) >= cutoff
                    )
                  }
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
          </>
        )}

        {activeTab === 'lyrics' && (
          <FullLyricsTab
            songTitle={songTitle}
            artistName={artistName}
            lyrics={lyrics}
            onLineClick={() => setActiveTab('posts')}
          />
        )}

        {activeTab === 'background' && (
          <SongBackgroundTab
            songTitle={songTitle}
            artistName={artistName}
          />
        )}
      </div>

      {showShareModal && (
        <PageShareModal
          pageTitle={songTitle}
          pageSubtitle={artistName}
          statsLine={`${lyrics.length} ${lyrics.length === 1 ? 'lyric' : 'lyrics'} shared${uniqueUsers > 1 ? ` · ${uniqueUsers} people` : ''}${totalResonances > 0 ? ` · ${totalResonances} resonances` : ''}`}
          featuredLyric={clusters[0]?.representative?.content}
          coverArtUrl={coverArt}
          shareUrl={window.location.href}
          shareText={`"${songTitle}" lyrics on earwyrm`}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
