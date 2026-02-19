import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from './AuthContext'

const NotificationContext = createContext({})

export function NotificationProvider({ children }) {
  const { user, profile } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const channelRef = useRef(null)

  // Fetch unread count based on last_activity_seen_at
  const fetchUnreadCount = useCallback(async () => {
    if (!user || !profile) return

    const seenAt = profile.last_activity_seen_at || '1970-01-01T00:00:00Z'

    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .gt('created_at', seenAt)

    if (!error && data) {
      setUnreadCount(data.length)
    }
  }, [user?.id, profile?.last_activity_seen_at])

  // Fetch notifications with server-side pagination and optional type filter
  const fetchNotifications = useCallback(async ({ offset = 0, limit = 20, type = null } = {}) => {
    if (!user) return

    setLoading(true)
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (type) {
        if (Array.isArray(type)) {
          query = query.in('type', type)
        } else {
          query = query.eq('type', type)
        }
      }

      if (offset > 0) {
        query = query.range(offset, offset + limit - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        return
      }

      if (offset === 0) {
        setNotifications(data || [])
      } else {
        setNotifications(prev => [...prev, ...(data || [])])
      }

      setHasMore((data || []).length === limit)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Mark all as seen by updating last_activity_seen_at
  const markAsSeen = useCallback(async () => {
    if (!user) return

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('profiles')
      .update({ last_activity_seen_at: now })
      .eq('id', user.id)

    if (!error) {
      setUnreadCount(0)
    }
  }, [user?.id])

  // Fetch unread count on mount and when profile changes
  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Set up realtime subscription for new notifications
  useEffect(() => {
    if (!user) return

    const channel = supabase.channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setUnreadCount(prev => prev + 1)
          setNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id])

  const value = {
    unreadCount,
    notifications,
    loading,
    hasMore,
    fetchNotifications,
    markAsSeen,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
