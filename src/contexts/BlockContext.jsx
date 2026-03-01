import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from './AuthContext'

const BlockContext = createContext({})

export function BlockProvider({ children }) {
  const { user } = useAuth()
  const [blockedUserIds, setBlockedUserIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const fetchBlocked = useCallback(async () => {
    if (!user) {
      setBlockedUserIds(new Set())
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocked_user_id')
        .eq('blocker_id', user.id)

      if (error) throw error
      setBlockedUserIds(new Set((data || []).map(b => b.blocked_user_id)))
    } catch (err) {
      console.error('Error fetching blocks:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchBlocked()
  }, [fetchBlocked])

  const blockUser = useCallback(async (targetUserId) => {
    if (!user) return

    // Optimistic update
    setBlockedUserIds(prev => new Set([...prev, targetUserId]))

    try {
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_user_id: targetUserId,
        })

      if (error && error.code !== '23505') {
        throw error
      }
    } catch (err) {
      // Revert on failure
      setBlockedUserIds(prev => {
        const next = new Set(prev)
        next.delete(targetUserId)
        return next
      })
      console.error('Error blocking user:', err)
    }
  }, [user?.id])

  const unblockUser = useCallback(async (targetUserId) => {
    if (!user) return

    // Optimistic update
    setBlockedUserIds(prev => {
      const next = new Set(prev)
      next.delete(targetUserId)
      return next
    })

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', targetUserId)

      if (error) throw error
    } catch (err) {
      // Revert on failure
      setBlockedUserIds(prev => new Set([...prev, targetUserId]))
      console.error('Error unblocking user:', err)
    }
  }, [user?.id])

  const isBlocked = useCallback((userId) => {
    return blockedUserIds.has(userId)
  }, [blockedUserIds])

  return (
    <BlockContext.Provider value={{
      blockedUserIds,
      loading,
      blockUser,
      unblockUser,
      isBlocked,
    }}>
      {children}
    </BlockContext.Provider>
  )
}

export function useBlock() {
  return useContext(BlockContext)
}
