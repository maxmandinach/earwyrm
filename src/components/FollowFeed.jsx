import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useFollow } from '../contexts/FollowContext'
import LyricCard from './LyricCard'

export default function FollowFeed({ limit = 5 }) {
  const { follows, loading: followsLoading } = useFollow()
  const [lyrics, setLyrics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (followsLoading) return
    if (follows.length === 0) {
      setLoading(false)
      return
    }

    async function fetchFeed() {
      try {
        // Build OR conditions for all follows
        const tagFollows = follows.filter(f => f.filter_type === 'tag').map(f => f.filter_value)
        const artistFollows = follows.filter(f => f.filter_type === 'artist').map(f => f.filter_value)
        const songFollows = follows.filter(f => f.filter_type === 'song').map(f => f.filter_value)

        // Fetch recent public lyrics matching any follow
        let query = supabase
          .from('lyrics')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(limit)

        // Build filter conditions
        const conditions = []
        if (artistFollows.length > 0) {
          conditions.push(`artist_name.in.(${artistFollows.join(',')})`)
        }
        if (songFollows.length > 0) {
          conditions.push(`song_title.in.(${songFollows.join(',')})`)
        }

        // For tags we need contains, handle separately
        // Use a combined approach: fetch more and filter client-side for tags
        if (conditions.length > 0) {
          query = query.or(conditions.join(','))
        }

        const { data, error } = await query

        if (error) throw error

        let results = data || []

        // Client-side tag filtering if we have tag follows
        if (tagFollows.length > 0 && conditions.length === 0) {
          // If only tag follows, fetch recent and filter
          const { data: allData } = await supabase
            .from('lyrics')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(50)

          if (allData) {
            results = allData.filter(l =>
              l.tags?.some(t => tagFollows.some(ft => ft.toLowerCase() === t.toLowerCase()))
            ).slice(0, limit)
          }
        } else if (tagFollows.length > 0) {
          // Also check tags for combined results
          const { data: tagData } = await supabase
            .from('lyrics')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(50)

          if (tagData) {
            const tagMatches = tagData.filter(l =>
              l.tags?.some(t => tagFollows.some(ft => ft.toLowerCase() === t.toLowerCase())) &&
              !results.some(r => r.id === l.id)
            )
            results = [...results, ...tagMatches]
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, limit)
          }
        }

        setLyrics(results)
      } catch (err) {
        console.error('Error fetching follow feed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeed()
  }, [follows, followsLoading, limit])

  if (loading || lyrics.length === 0) return null

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider">From your follows</h2>
        <Link to="/following" className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors">
          See all →
        </Link>
      </div>
      <div className="space-y-4">
        {lyrics.map((lyric) => (
          <LyricCard
            key={lyric.id}
            lyric={lyric}
            showTimestamp
            linkable
            className="border border-charcoal/10"
          />
        ))}
      </div>
    </div>
  )
}
