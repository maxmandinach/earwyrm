import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { formatRelativeTime } from '../lib/utils'

export default function Activity() {
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
          .limit(50)

        // Fetch recent comments on user's public lyrics
        const { data: commentData } = await supabase
          .from('comments')
          .select('*, lyrics!inner(id, content, song_title, artist_name, user_id, share_token), profiles:user_id(username)')
          .eq('lyrics.user_id', user.id)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

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
            const snippet = lyric.content.length > 50
              ? lyric.content.substring(0, 50) + '...'
              : lyric.content
            items.push({
              type: 'reaction',
              lyric,
              count,
              created_at: latest,
              text: `${count} ${count === 1 ? 'person' : 'people'} resonated`,
              snippet,
            })
          })
        }

        if (commentData) {
          commentData.forEach(c => {
            const snippet = c.lyrics.content.length > 50
              ? c.lyrics.content.substring(0, 50) + '...'
              : c.lyrics.content
            items.push({
              type: 'comment',
              lyric: c.lyrics,
              username: c.profiles?.username,
              commentContent: c.content,
              created_at: c.created_at,
              text: c.profiles?.username ? `@${c.profiles.username} commented` : 'Someone commented',
              snippet,
            })
          })
        }

        // Sort by recency
        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setActivities(items)
      } catch (err) {
        console.error('Error fetching activity:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [user?.id])

  // Generate link for activity item
  function getLinkForActivity(activity) {
    if (activity.lyric.share_token) {
      return `/s/${activity.lyric.share_token}`
    }
    if (activity.lyric.song_title) {
      return `/song/${encodeURIComponent(activity.lyric.song_title.toLowerCase())}`
    }
    return '/home'
  }

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
        <h1
          className="text-2xl text-charcoal mb-6"
          style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
        >
          Activity
        </h1>

        {activities.length === 0 ? (
          <div className="text-center py-12">
            <p
              className="text-xl mb-2"
              style={{ fontFamily: "'Caveat', cursive", color: '#6B635A' }}
            >
              No activity yet
            </p>
            <p className="text-sm text-charcoal-light">
              When people resonate with or comment on your lyrics, you'll see it here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((activity, i) => (
              <Link
                key={`${activity.type}-${activity.lyric.id}-${i}`}
                to={getLinkForActivity(activity)}
                className="block px-4 py-4 hover:bg-charcoal/5 transition-colors border-b border-charcoal/5 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {activity.type === 'reaction' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-charcoal/40">
                        {[
                          { x: 4, h: 10 },
                          { x: 8, h: 16 },
                          { x: 12, h: 20 },
                          { x: 16, h: 16 },
                          { x: 20, h: 10 },
                        ].map((bar, i) => (
                          <line
                            key={i}
                            x1={bar.x} y1={12 - bar.h / 2}
                            x2={bar.x} y2={12 + bar.h / 2}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        ))}
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-charcoal/40">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-charcoal/70">{activity.text}</p>
                    <p
                      className="text-sm text-charcoal/40 mt-1 truncate"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      "{activity.snippet}"
                    </p>
                    {activity.type === 'comment' && activity.commentContent && (
                      <p className="text-xs text-charcoal/30 mt-1 italic truncate">
                        "{activity.commentContent}"
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-xs text-charcoal/25 flex-shrink-0">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
