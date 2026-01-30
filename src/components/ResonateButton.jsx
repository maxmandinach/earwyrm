import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'

export default function ResonateButton({ lyricId, initialCount = 0 }) {
  const { user } = useAuth()
  const [hasReacted, setHasReacted] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [animating, setAnimating] = useState(false)

  // Check if user has reacted
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

  async function toggle() {
    if (!user) {
      // Could prompt sign-in here
      return
    }

    // Optimistic update
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
      // Revert on error
      setHasReacted(wasReacted)
      setCount(prev => wasReacted ? prev + 1 : prev - 1)
      console.error('Error toggling reaction:', err)
    }
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 text-xs transition-all duration-200 py-1 px-2 ${
        hasReacted
          ? 'text-charcoal/70'
          : 'text-charcoal/30 hover:text-charcoal/50'
      }`}
      style={{
        transform: animating ? 'scale(1.15)' : 'scale(1)',
      }}
      title={user ? (hasReacted ? 'Remove resonance' : 'Resonate') : 'Sign in to resonate'}
    >
      {/* Ripple/wave icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={hasReacted ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12c2-3 5-5 10-5s8 2 10 5" />
        <path d="M5 12c1.5-2 3.5-3 7-3s5.5 1 7 3" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
