import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import LyricCard from './LyricCard'
import ResonateButton from './ResonateButton'

export default function TrendingSection() {
  const [lyrics, setLyrics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrending() {
      try {
        // Get lyrics with most reactions in last 24h
        // Fallback: recent public lyrics ordered by reaction_count
        const { data, error } = await supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .order('reaction_count', { ascending: false })
          .limit(3)

        if (error) throw error
        setLyrics(data || [])
      } catch (err) {
        console.error('Error fetching trending:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTrending()
  }, [])

  if (loading || lyrics.length === 0) return null

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-3">Trending</h2>
      <div className="space-y-4">
        {lyrics.map((lyric) => (
          <LyricCard
            key={lyric.id}
            lyric={lyric}
            showTimestamp={false}
            linkable
            className="border border-charcoal/10"
            showActions
            isAnon={false}
          />
        ))}
      </div>
    </div>
  )
}
