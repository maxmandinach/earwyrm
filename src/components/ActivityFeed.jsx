import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { formatRelativeTime } from '../lib/utils'

export default function ActivityFeed() {
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function fetchActivity() {
      try {
        // Fetch recent reactions on user's public lyrics
        const { data: reactionData } = await supabase
          .from('reactions')
          .select('*, lyrics!inner(id, content, song_title, artist_name, user_id, share_token)')
          .eq('lyrics.user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Fetch recent comments on user's public lyrics
        const { data: commentData } = await supabase
          .from('comments')
          .select('*, lyrics!inner(id, content, song_title, artist_name, user_id, share_token), profiles:user_id(username)')
          .eq('lyrics.user_id', user.id)
          .neq('user_id', user.id) // exclude own comments
          .order('created_at', { ascending: false })
          .limit(10)

        const items = []

        if (reactionData) {
          // Group reactions by lyric
          const byLyric = {}
          reactionData.forEach(r => {
            const key = r.lyrics.id
            if (!byLyric[key]) byLyric[key] = { lyric: r.lyrics, count: 0, latest: r.created_at }
            byLyric[key].count++
          })

          Object.values(byLyric).forEach(({ lyric, count, latest }) => {
            items.push({
              type: 'reaction',
              lyric,
              count,
              created_at: latest,
              text: `${count} ${count === 1 ? 'person' : 'people'} resonated with your ${lyric.artist_name || lyric.song_title || 'lyric'}`,
            })
          })
        }

        if (commentData) {
          commentData.forEach(c => {
            items.push({
              type: 'comment',
              lyric: c.lyrics,
              username: c.profiles?.username,
              content: c.content,
              created_at: c.created_at,
              text: `${c.profiles?.username ? `@${c.profiles.username}` : 'Someone'} shared a thought on your ${c.lyrics.song_title || 'lyric'}`,
            })
          })
        }

        // Sort by recency
        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setActivities(items.slice(0, 8))
      } catch (err) {
        console.error('Error fetching activity:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [user?.id])

  // Generate link for activity item - prefer share_token for direct lyric link
  function getLinkForActivity(activity) {
    if (activity.lyric.share_token) {
      return `/s/${activity.lyric.share_token}`
    }
    if (activity.lyric.song_title) {
      return `/song/${encodeURIComponent(activity.lyric.song_title.toLowerCase())}`
    }
    return '/home'
  }

  if (loading || activities.length === 0) return null

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider">Activity on your lyrics</h2>
        <Link to="/activity" className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors">
          See all →
        </Link>
      </div>
      <div className="space-y-2">
        {activities.map((activity, i) => (
          <Link
            key={i}
            to={getLinkForActivity(activity)}
            className="block px-3 py-2 hover:bg-charcoal/5 transition-colors"
          >
            <p className="text-sm text-charcoal/60">{activity.text}</p>
            <p className="text-xs text-charcoal/25 mt-0.5">{formatRelativeTime(activity.created_at)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
