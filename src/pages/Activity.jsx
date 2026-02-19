import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNotification } from '../contexts/NotificationContext'
import { formatRelativeTime } from '../lib/utils'

const TABS = [
  { key: 'all', label: 'All', types: null },
  { key: 'resonances', label: 'Resonances', types: 'reaction' },
  { key: 'comments', label: 'Comments', types: ['comment', 'reply'] },
  { key: 'follows', label: 'Follows', types: ['new_lyric', 'collection_add'] },
]

const PAGE_SIZE = 20

function NotificationIcon({ type, className = '' }) {
  if (type === 'reaction') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
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
    )
  }
  if (type === 'comment' || type === 'reply') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    )
  }
  if (type === 'new_lyric') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    )
  }
  // collection_add
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function getNotificationLink(n) {
  if (n.share_token) {
    const ref = (n.type === 'comment' || n.type === 'reply')
      ? `?ref=comment${n.comment_id ? `&cid=${n.comment_id}` : ''}`
      : n.type === 'reaction' ? '?ref=reaction' : ''
    return `/s/${n.share_token}${ref}`
  }
  if (n.type === 'collection_add' && n.collection_id) {
    return `/collections/${n.collection_id}`
  }
  if (n.song_title) {
    return `/song/${encodeURIComponent(n.song_title.toLowerCase())}`
  }
  return '/activity'
}

// Group consecutive reaction notifications for the same lyric
function groupReactions(notifications) {
  const result = []
  const reactionsByLyric = {}

  for (const n of notifications) {
    if (n.type === 'reaction' && n.lyric_id) {
      if (!reactionsByLyric[n.lyric_id]) {
        reactionsByLyric[n.lyric_id] = {
          ...n,
          _grouped: true,
          _count: 1,
          _actors: [n.actor_username].filter(Boolean),
        }
        result.push(reactionsByLyric[n.lyric_id])
      } else {
        reactionsByLyric[n.lyric_id]._count++
        if (n.actor_username && !reactionsByLyric[n.lyric_id]._actors.includes(n.actor_username)) {
          reactionsByLyric[n.lyric_id]._actors.push(n.actor_username)
        }
        // Use the most recent timestamp
        if (new Date(n.created_at) > new Date(reactionsByLyric[n.lyric_id].created_at)) {
          reactionsByLyric[n.lyric_id].created_at = n.created_at
        }
      }
    } else {
      result.push(n)
    }
  }

  return result
}

function getGroupedText(n) {
  if (n._grouped && n._count > 1) {
    return `${n._count} ${n._count === 1 ? 'person' : 'people'} resonated`
  }
  switch (n.type) {
    case 'reaction':
      return `${n.actor_username ? `@${n.actor_username}` : 'Someone'} resonated`
    case 'comment':
      return `${n.actor_username ? `@${n.actor_username}` : 'Someone'} commented`
    case 'reply':
      return `${n.actor_username ? `@${n.actor_username}` : 'Someone'} replied to your comment`
    case 'new_lyric':
      if (n.follow_type === 'tag') return `New lyric for #${n.follow_value}`
      if (n.follow_type === 'artist') return `New lyric from ${n.artist_name}`
      return `New lyric for ${n.song_title}`
    case 'collection_add':
      return `New lyric added to ${n.collection_name}`
    default:
      return 'New activity'
  }
}

export default function Activity() {
  const { notifications, loading, hasMore, fetchNotifications, markAsSeen, markAsRead } = useNotification()
  const [activeTab, setActiveTab] = useState('all')
  const [offset, setOffset] = useState(0)

  // Mark as seen on mount
  useEffect(() => {
    markAsSeen()
  }, [markAsSeen])

  // Fetch initial notifications for active tab
  useEffect(() => {
    const tab = TABS.find(t => t.key === activeTab)
    setOffset(0)
    fetchNotifications({ offset: 0, limit: PAGE_SIZE, type: tab?.types || null })
  }, [activeTab, fetchNotifications])

  const displayItems = useMemo(() => {
    if (activeTab === 'resonances') {
      return groupReactions(notifications)
    }
    return notifications
  }, [notifications, activeTab])

  function handleLoadMore() {
    const tab = TABS.find(t => t.key === activeTab)
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    fetchNotifications({ offset: newOffset, limit: PAGE_SIZE, type: tab?.types || null })
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-8">
      <div className="max-w-lg mx-auto w-full">
        <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase mb-6">
          activity
        </h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-charcoal text-white'
                  : 'bg-charcoal/5 text-charcoal/50 hover:bg-charcoal/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {loading && notifications.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-charcoal/30 text-sm">Loading...</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-12">
            <p
              className="text-xl mb-2"
              style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
            >
              No activity yet
            </p>
            <p className="text-sm text-charcoal/30">
              When people resonate with or comment on your lyrics, you'll see it here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayItems.map((n, i) => {
              const isRead = !!n.read_at
              return (
              <Link
                key={n.id || `grouped-${n.lyric_id}-${i}`}
                to={getNotificationLink(n)}
                onClick={() => n.id && markAsRead(n.id)}
                className={`block px-4 py-4 hover:bg-charcoal/5 transition-colors border-b border-charcoal/5 last:border-b-0 ${!isRead ? 'bg-charcoal/[0.03]' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <NotificationIcon type={n.type} className={isRead ? 'text-charcoal/25' : 'text-charcoal/50'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isRead ? 'text-charcoal/40' : 'text-charcoal/70 font-medium'}`}>{getGroupedText(n)}</p>
                    {n.lyric_snippet && (
                      <p
                        className={`text-sm mt-1 truncate ${isRead ? 'text-charcoal/25' : 'text-charcoal/40'}`}
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        "{n.lyric_snippet}"
                      </p>
                    )}
                    {(n.type === 'comment' || n.type === 'reply') && n.comment_content && (
                      <p className={`text-xs mt-1 italic truncate ${isRead ? 'text-charcoal/20' : 'text-charcoal/30'}`}>
                        "{n.comment_content}"
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-charcoal/30 flex-shrink-0">
                    {formatRelativeTime(n.created_at)}
                  </span>
                </div>
              </Link>
              )
            })}

            {/* Load more button */}
            {hasMore && (
              <div className="pt-4 pb-2 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-4 py-2 text-xs text-charcoal/50 hover:text-charcoal/70 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
