import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from './AuthContext'

const FollowContext = createContext({})

export function FollowProvider({ children }) {
  const { user } = useAuth()
  const [follows, setFollows] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFollows = useCallback(async () => {
    if (!user) {
      setFollows([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFollows(data || [])
    } catch (err) {
      console.error('Error fetching follows:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchFollows()
  }, [fetchFollows])

  async function follow(filterType, filterValue) {
    if (!user) throw new Error('Must be logged in to follow')

    const { data, error } = await supabase
      .from('follows')
      .insert({
        user_id: user.id,
        filter_type: filterType,
        filter_value: filterValue,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        // Already following
        return
      }
      throw error
    }

    setFollows([data, ...follows])
    return data
  }

  async function unfollow(filterType, filterValue) {
    if (!user) throw new Error('Must be logged in to unfollow')

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('user_id', user.id)
      .eq('filter_type', filterType)
      .eq('filter_value', filterValue)

    if (error) throw error

    setFollows(follows.filter(f =>
      !(f.filter_type === filterType && f.filter_value === filterValue)
    ))
  }

  function isFollowing(filterType, filterValue) {
    return follows.some(f =>
      f.filter_type === filterType &&
      f.filter_value.toLowerCase() === filterValue.toLowerCase()
    )
  }

  const value = {
    follows,
    loading,
    follow,
    unfollow,
    isFollowing,
    refreshFollows: fetchFollows,
  }

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>
}

export function useFollow() {
  const context = useContext(FollowContext)
  if (!context) {
    throw new Error('useFollow must be used within a FollowProvider')
  }
  return context
}
