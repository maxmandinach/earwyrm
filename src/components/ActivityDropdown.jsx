import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { formatRelativeTime } from '../lib/utils'

export default function ActivityDropdown() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Fetch activity when dropdown opens
  useEffect(() => {
    if (!isOpen || !user) return

    async function fetchActivity() {
      setLoading(true)
      try {
        const { data: reactionData } = await supabase
          .from('reactions')
          .select('*, lyrics!inner(id, content, song_title, artist_name, user_id, share_token)')
          .eq('lyrics.user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        const { data: commentData } = await supabase
          .from('comments')
          .select('*, lyrics!inner(id, content, song_title, artist_name, user_id, share_token), profiles:user_id(username)')
          .eq('lyrics.user_id', user.id)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        const items = []

        if (reactionData) {
          const byLyric = {}
          reactionData.forEach(r => {
            const key = r.lyrics.id
            if (!byLyric[key]) byLyric[key] = { lyric: r.lyrics, count: 0, latest: r.created_at }
            byLyric[key].count++
          })

          Object.values(byLyric).forEach(({ lyric, count, latest }) => {
            const snippet = lyric.content.length > 40
              ? lyric.content.substring(0, 40) + '...'
              : lyric.content
            items.push({
              type: 'reaction',
              lyric,
              count,
              created_at: latest,
              text: `${count} resonated`,
              snippet,
            })
          })
        }

        if (commentData) {
          commentData.forEach(c => {
            const snippet = c.lyrics.content.length > 40
              ? c.lyrics.content.substring(0, 40) + '...'
              : c.lyrics.content
            items.push({
              type: 'comment',
              lyric: c.lyrics,
              username: c.profiles?.username,
              created_at: c.created_at,
              text: c.profiles?.username ? `@${c.profiles.username}` : 'Someone',
              snippet,
            })
          })
        }

        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setActivities(items.slice(0, 8))
      } catch (err) {
        console.error('Error fetching activity:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [isOpen, user?.id])

  function getLinkForActivity(activity) {
    if (activity.lyric.share_token) {
      return `/s/${activity.lyric.share_token}`
    }
    if (activity.lyric.song_title) {
      return `/song/${encodeURIComponent(activity.lyric.song_title.toLowerCase())}`
    }
    return '/home'
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-charcoal/40 hover:text-charcoal/70 transition-colors"
        aria-label="Activity"
        title="Activity"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          {[
            { x: 4, h: 8 },
            { x: 8, h: 14 },
            { x: 12, h: 18 },
            { x: 16, h: 14 },
            { x: 20, h: 8 },
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
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 shadow-lg z-50 overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-elevated, #FAF8F5)',
            border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          }}
        >
          <div className="px-4 py-3 border-b border-charcoal/10">
            <h3 className="text-sm font-medium text-charcoal">Activity</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-charcoal/40">Loading...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-charcoal/40">No activity yet</p>
              </div>
            ) : (
              <div>
                {activities.map((activity, i) => (
                  <Link
                    key={`${activity.type}-${activity.lyric.id}-${i}`}
                    to={getLinkForActivity(activity)}
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 hover:bg-charcoal/5 transition-colors border-b border-charcoal/5 last:border-b-0"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {activity.type === 'reaction' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-charcoal/40">
                            {[
                              { x: 4, h: 8 },
                              { x: 8, h: 14 },
                              { x: 12, h: 18 },
                              { x: 16, h: 14 },
                              { x: 20, h: 8 },
                            ].map((bar, j) => (
                              <line
                                key={j}
                                x1={bar.x} y1={12 - bar.h / 2}
                                x2={bar.x} y2={12 + bar.h / 2}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            ))}
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-charcoal/40">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-charcoal/70">
                          <span className="font-medium">{activity.text}</span>
                          {activity.type === 'comment' && ' commented'}
                        </p>
                        <p
                          className="text-xs text-charcoal/40 mt-0.5 truncate"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          "{activity.snippet}"
                        </p>
                      </div>
                      <span className="text-xs text-charcoal/25 flex-shrink-0">
                        {formatRelativeTime(activity.created_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/activity"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-center text-xs text-charcoal/50 hover:text-charcoal/70 hover:bg-charcoal/5 transition-colors border-t border-charcoal/10"
          >
            See all activity
          </Link>
        </div>
      )}
    </div>
  )
}
