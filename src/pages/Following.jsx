import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useFollow } from '../contexts/FollowContext'
import { useAuth } from '../contexts/AuthContext'
import LyricCard from '../components/LyricCard'

export default function Following() {
  const { follows, loading: followsLoading, unfollow } = useFollow()
  const { user } = useAuth()
  const [lyrics, setLyrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const PAGE_SIZE = 20

  useEffect(() => {
    if (followsLoading) return
    if (follows.length === 0) {
      setLyrics([])
      setLoading(false)
      return
    }

    async function fetchFeed() {
      setLoading(true)
      try {
        const artistFollows = follows.filter(f => f.filter_type === 'artist').map(f => f.filter_value)
        const songFollows = follows.filter(f => f.filter_type === 'song').map(f => f.filter_value)
        const tagFollows = follows.filter(f => f.filter_type === 'tag').map(f => f.filter_value)

        // Fetch recent public lyrics
        const { data } = await supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(100)

        if (data) {
          // Filter client-side for all follow types
          const matched = data.filter(l => {
            if (artistFollows.some(a => l.artist_name?.toLowerCase() === a.toLowerCase())) return true
            if (songFollows.some(s => l.song_title?.toLowerCase() === s.toLowerCase())) return true
            if (tagFollows.some(t => l.tags?.some(lt => lt.toLowerCase() === t.toLowerCase()))) return true
            return false
          })

          setLyrics(matched.slice(0, PAGE_SIZE))
          setHasMore(matched.length > PAGE_SIZE)
        }
      } catch (err) {
        console.error('Error fetching feed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeed()
  }, [follows, followsLoading])

  if (followsLoading || loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <p className="text-sm text-charcoal-light/60">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase">
          feed
        </h1>
        {follows.length > 0 && (
          <Link
            to="/settings"
            className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
          >
            Manage follows
          </Link>
        )}
      </div>

      {follows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light/60 mb-2">
            Follow artists and tags on Explore to build your feed
          </p>
          <Link
            to="/explore"
            className="text-sm text-charcoal/60 hover:text-charcoal transition-colors"
          >
            Go to Explore →
          </Link>
        </div>
      ) : lyrics.length === 0 ? (
        <div className="text-center py-12">
          <p
            className="text-xl mb-2"
            style={{ fontFamily: "'Caveat', cursive", color: '#6B635A' }}
          >
            Nothing new yet
          </p>
          <p className="text-sm text-charcoal-light">
            New public lyrics from your follows will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {lyrics.map((lyric) => (
            <LyricCard
              key={lyric.id}
              lyric={lyric}
              showTimestamp
              linkable
              className="border border-charcoal/10"
              showActions
              isAnon={!user}
              isOwn={user?.id === lyric.user_id}
            />
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => {
                  setPage(prev => prev + 1)
                }}
                className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
