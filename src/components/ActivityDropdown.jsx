import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { formatRelativeTime } from '../lib/utils'

function NotificationIcon({ type, className = '' }) {
  if (type === 'reaction') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className}>
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
    )
  }
  if (type === 'comment') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    )
  }
  if (type === 'new_lyric') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    )
  }
  // collection_add
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function getNotificationText(n) {
  switch (n.type) {
    case 'reaction':
      return `${n.actor_username ? `@${n.actor_username}` : 'Someone'} resonated`
    case 'comment':
      return `${n.actor_username ? `@${n.actor_username}` : 'Someone'} commented`
    case 'new_lyric':
      if (n.follow_type === 'tag') return `New lyric for #${n.follow_value}`
      if (n.follow_type === 'artist') return `New lyric from ${n.artist_name}`
      return `New lyric for ${n.song_title}`
    case 'collection_add':
      return `New lyric in ${n.collection_name}`
    default:
      return 'New activity'
  }
}

function getNotificationLink(n) {
  if (n.share_token) {
    const ref = n.type === 'comment'
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

export default function ActivityDropdown() {
  const { user } = useAuth()
  const { unreadCount, notifications, fetchNotifications, loading, markAsRead } = useNotification()
  const [isOpen, setIsOpen] = useState(false)
  const [fetched, setFetched] = useState(false)
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

  // Fetch notifications when dropdown opens for the first time
  useEffect(() => {
    if (isOpen && !fetched) {
      fetchNotifications({ limit: 5 })
      setFetched(true)
    }
  }, [isOpen, fetched, fetchNotifications])

  if (!user) return null

  const displayItems = notifications.slice(0, 5)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-charcoal/40 hover:text-charcoal/70 transition-colors relative"
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
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-elevated, #FAF8F5)',
            border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          }}
        >
          <div className="px-4 py-2.5 border-b border-charcoal/10">
            <h3 className="text-sm font-medium text-charcoal">Activity</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && !fetched ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-charcoal/40">Loading...</p>
              </div>
            ) : displayItems.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-charcoal/40">No activity yet</p>
              </div>
            ) : (
              <div>
                {displayItems.map((n) => {
                  const isRead = !!n.read_at
                  return (
                  <Link
                    key={n.id}
                    to={getNotificationLink(n)}
                    onClick={() => { markAsRead(n.id); setIsOpen(false) }}
                    className={`block px-4 py-2.5 hover:bg-charcoal/5 transition-colors border-b border-charcoal/5 last:border-b-0 ${!isRead ? 'bg-charcoal/[0.03]' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <NotificationIcon type={n.type} className={isRead ? 'text-charcoal/25' : 'text-charcoal/50'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${isRead ? 'text-charcoal/40' : 'text-charcoal/70 font-medium'}`}>
                          {getNotificationText(n)}
                        </p>
                        {n.lyric_snippet && (
                          <p
                            className={`text-xs mt-0.5 truncate ${isRead ? 'text-charcoal/25' : 'text-charcoal/40'}`}
                            style={{ fontFamily: "'Caveat', cursive" }}
                          >
                            "{n.lyric_snippet}"
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-charcoal/25 flex-shrink-0">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                  </Link>
                  )
                })}
              </div>
            )}
          </div>

          <Link
            to="/activity"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2.5 text-center text-xs text-charcoal/50 hover:text-charcoal/70 hover:bg-charcoal/5 transition-colors border-t border-charcoal/10"
          >
            See all activity
          </Link>
        </div>
      )}
    </div>
  )
}
