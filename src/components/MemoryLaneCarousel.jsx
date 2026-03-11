import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import { supabase } from '../lib/supabase-wrapper'

function CompactMemoryCard({ lyric, index }) {
  return (
    <div
      className="flex-shrink-0 w-[240px] sm:w-[260px] carousel-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Link
        to="/history"
        className="block p-4 h-full"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08))',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        }}
      >
        {/* Lyric snippet */}
        <p
          className="text-charcoal/70 leading-relaxed mb-2 line-clamp-2"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '1.05rem' }}
        >
          {lyric.content}
        </p>

        {/* Attribution */}
        {(lyric.song_title || lyric.artist_name) && (
          <div className="flex items-center gap-2">
            {lyric.cover_art_url && (
              <div
                className="w-6 h-6 flex-shrink-0 rounded"
                style={{
                  backgroundImage: `url(${lyric.cover_art_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              />
            )}
            <p className="text-xs text-charcoal/30 italic truncate">
              {lyric.song_title}
              {lyric.song_title && lyric.artist_name && ' — '}
              {lyric.artist_name}
            </p>
          </div>
        )}
      </Link>
    </div>
  )
}

export default function MemoryLaneCarousel() {
  const { user } = useAuth()
  const { currentLyric } = useLyric()
  const [pastLyrics, setPastLyrics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPastLyrics() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_saved', false)

        if (error) throw error

        // Filter out current lyric and sort by created_at desc
        const past = (data || [])
          .filter(l => !currentLyric || l.id !== currentLyric.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 8)

        setPastLyrics(past)
      } catch (err) {
        console.error('Error fetching past lyrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPastLyrics()
  }, [user, currentLyric?.id])

  if (loading || pastLyrics.length < 3) return null

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-light text-charcoal/40 lowercase tracking-wide">
          memory lane
        </h2>
        <Link
          to="/history"
          className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
        >
          See all
        </Link>
      </div>

      <div
        className="-mx-4 px-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {pastLyrics.map((lyric, i) => (
          <div key={lyric.id} style={{ scrollSnapAlign: 'start' }}>
            <CompactMemoryCard lyric={lyric} index={i} />
          </div>
        ))}
      </div>
    </div>
  )
}
