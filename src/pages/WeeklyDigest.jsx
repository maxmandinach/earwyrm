import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { themes } from '../lib/themes'

function DigestLyricCard({ lyric }) {
  const theme = themes[lyric.theme] || themes.default

  const cardStyle = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontWeight: theme.fontWeight,
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
  }

  const secondaryStyle = {
    color: theme.secondaryColor,
    fontFamily: theme.fontFamily,
  }

  // Calculate how many days ago
  const daysAgo = Math.floor((Date.now() - new Date(lyric.created_at)) / (1000 * 60 * 60 * 24))
  const timeText = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="p-8" style={cardStyle}>
        <blockquote className="text-lg leading-relaxed mb-4">
          {lyric.content}
        </blockquote>

        {(lyric.song_title || lyric.artist_name) && (
          <p className="text-sm mb-2" style={secondaryStyle}>
            {lyric.song_title && <span>{lyric.song_title}</span>}
            {lyric.song_title && lyric.artist_name && <span> — </span>}
            {lyric.artist_name && <span>{lyric.artist_name}</span>}
          </p>
        )}

        <p className="text-xs opacity-50">
          Shared {timeText}
        </p>
      </div>
    </div>
  )
}

export default function WeeklyDigest() {
  const [digest, setDigest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDigest() {
      try {
        // Fetch the most recent weekly digest
        const { data, error } = await supabase
          .from('weekly_digests')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(1)
          .single()

        if (error) throw error
        setDigest(data)
      } catch (err) {
        console.error('Error fetching digest:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDigest()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-charcoal-light text-sm">Loading digest...</div>
      </div>
    )
  }

  if (!digest || !digest.lyrics || digest.lyrics.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <p className="text-lg text-charcoal-light text-center max-w-md mb-8">
          The first weekly digest will be published this Sunday
        </p>
        <Link
          to="/"
          className="text-sm text-charcoal hover:text-charcoal/60 transition-colors"
        >
          ← Back to current lyric
        </Link>
      </div>
    )
  }

  // Format the date range
  const publishedDate = new Date(digest.published_at)
  const weekStart = new Date(digest.week_of)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-light text-charcoal tracking-tight">
            Last Week in Lyrics
          </h1>
          <Link
            to="/"
            className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
          >
            Current
          </Link>
        </div>
        <p className="text-sm text-charcoal-light/60">
          {formatDate(weekStart)} – {formatDate(weekEnd)}, {publishedDate.getFullYear()}
        </p>
      </div>

      {/* Digest content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 pb-20">
          <p className="text-center text-sm text-charcoal-light mb-12">
            {digest.lyrics.length} {digest.lyrics.length === 1 ? 'moment' : 'moments'} from the past week
          </p>

          {/* Lyric cards */}
          <div className="space-y-12">
            {digest.lyrics.map((lyric, index) => (
              <DigestLyricCard key={lyric.id || index} lyric={lyric} />
            ))}
          </div>

          {/* End marker */}
          <div className="mt-16 pt-12 border-t border-charcoal/10 text-center">
            <div className="w-16 h-px bg-charcoal/20 mx-auto mb-6" />
            <p className="text-sm text-charcoal-light/60">
              See you next Sunday
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
