import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'

export default function useResonate(lyricId, initialCount = 0) {
  const { user } = useAuth()
  const [hasReacted, setHasReacted] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (!user || !lyricId) return

    async function check() {
      const { data } = await supabase
        .from('reactions')
        .select('id')
        .eq('lyric_id', lyricId)
        .eq('user_id', user.id)
        .single()

      setHasReacted(!!data)
    }
    check()
  }, [user?.id, lyricId])

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  async function toggle() {
    if (!user) return

    const wasReacted = hasReacted
    setHasReacted(!wasReacted)
    setCount(prev => wasReacted ? prev - 1 : prev + 1)

    if (!wasReacted) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 600)
    }

    try {
      if (wasReacted) {
        await supabase
          .from('reactions')
          .delete()
          .eq('lyric_id', lyricId)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('reactions')
          .insert({ lyric_id: lyricId, user_id: user.id })
      }
    } catch (err) {
      setHasReacted(wasReacted)
      setCount(prev => wasReacted ? prev + 1 : prev - 1)
      console.error('Error toggling reaction:', err)
    }
  }

  return { hasReacted, count, animating, toggle }
}
