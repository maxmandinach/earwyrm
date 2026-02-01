import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import HorizontalCardCarousel from './HorizontalCardCarousel'

export default function TrendingSection() {
  const [lyrics, setLyrics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrending() {
      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .order('reaction_count', { ascending: false })
          .limit(8)

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
    <HorizontalCardCarousel
      title="Trending"
      lyrics={lyrics}
      linkTo="/explore"
      linkLabel="Explore →"
    />
  )
}
