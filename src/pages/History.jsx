import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import { supabase } from '../lib/supabase-wrapper'
import NoteEditor from '../components/NoteEditor'
import { Link } from 'react-router-dom'
import { signatureStyle } from '../lib/themes'

// Compute duration a lyric was held as "current"
function computeDuration(createdAt, replacedAt) {
  const start = new Date(createdAt)
  const end = replacedAt ? new Date(replacedAt) : new Date()
  return end - start
}

// Format duration to human-readable string
function formatDuration(ms) {
  const mins = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (months >= 1) return `${months} ${months === 1 ? 'month' : 'months'}`
  if (weeks >= 1) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  if (days >= 1) return `${days} ${days === 1 ? 'day' : 'days'}`
  if (hours >= 1) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  return `${Math.max(1, mins)} min`
}

// Get duration tier: long (7+ days), medium (1-6 days), brief (<1 day)
function getDurationTier(ms) {
  const days = ms / (1000 * 60 * 60 * 24)
  if (days >= 7) return 'long'
  if (days >= 1) return 'medium'
  return 'brief'
}

// Group lyrics by month: "february 2026", "january 2026", etc.
function groupByMonth(lyrics) {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]
  const groups = []
  const groupMap = new Map()

  lyrics.forEach(lyric => {
    const d = new Date(lyric.created_at)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`

    if (!groupMap.has(key)) {
      const group = { label: key, lyrics: [] }
      groupMap.set(key, group)
      groups.push(group)
    }
    groupMap.get(key).lyrics.push(lyric)
  })

  return groups
}

function MonthHeader({ title }) {
  return (
    <div className="mb-8 mt-14 first:mt-0">
      <h2
        className="text-charcoal/40 lowercase"
        style={{ fontFamily: "'Caveat', cursive", fontSize: '1.2rem' }}
      >
        {title}
      </h2>
    </div>
  )
}

function CurrentLyricCard({ lyric }) {
  const theme = signatureStyle

  return (
    <Link to="/home" className="block mb-8">
      <div
        className="p-6 relative"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.1)',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        }}
      >
        {/* Now indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="inline-block w-2 h-2 rounded-full animate-now-pulse"
            style={{ backgroundColor: 'var(--color-accent, #B8A99A)' }}
          />
          <span className="text-xs text-charcoal/40 uppercase tracking-wider">now</span>
        </div>

        <blockquote
          className="leading-relaxed line-clamp-3"
          style={{
            fontFamily: theme.fontFamily,
            fontSize: '1.5rem',
            fontWeight: theme.fontWeight,
            lineHeight: theme.lineHeight,
            color: 'var(--text-primary, #2C2825)',
          }}
        >
          {lyric.content}
        </blockquote>

        {(lyric.song_title || lyric.artist_name) && (
          <p className="text-xs text-charcoal/35 italic mt-3 truncate">
            {lyric.song_title}
            {lyric.song_title && lyric.artist_name && ' — '}
            {lyric.artist_name}
          </p>
        )}
      </div>
    </Link>
  )
}

function TimelineEntry({ lyric, note, index }) {
  const theme = signatureStyle
  const [expanded, setExpanded] = useState(false)

  const durationMs = computeDuration(lyric.created_at, lyric.replaced_at)
  const durationLabel = formatDuration(durationMs)
  const tier = getDurationTier(durationMs)

  // Visual weight by tier
  const tierStyles = {
    long: {
      padding: 'p-6 sm:p-8',
      fontSize: '1.6rem',
      borderLeft: '3px solid var(--color-accent, #B8A99A)',
    },
    medium: {
      padding: 'p-6',
      fontSize: '1.5rem',
      borderLeft: 'none',
    },
    brief: {
      padding: 'p-5',
      fontSize: '1.3rem',
      borderLeft: 'none',
    },
  }

  const style = tierStyles[tier]

  const cardStyle = {
    backgroundColor: 'var(--surface-card, #F5F2ED)',
    color: 'var(--text-primary, #2C2825)',
    fontFamily: theme.fontFamily,
    fontSize: style.fontSize,
    fontWeight: theme.fontWeight,
    lineHeight: theme.lineHeight,
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
    boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08))',
    border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
    borderLeft: style.borderLeft,
  }

  const lines = lyric.content.split('\n')
  const maxLines = tier === 'brief' ? 2 : 3
  const shouldTruncate = lines.length > maxLines
  const displayLines = expanded || !shouldTruncate ? lines : lines.slice(0, maxLines)

  return (
    <div
      className="mb-6 carousel-card"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="relative">
        <div
          className={style.padding}
          style={cardStyle}
        >
          {/* Duration badge */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="inline-block text-xs text-charcoal/40 px-2 py-0.5 badge-enter"
              style={{
                backgroundColor: 'var(--surface-bg, #E8E2D9)',
                border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
                animationDelay: `${Math.min(index * 40 + 100, 500)}ms`,
              }}
            >
              {durationLabel}
            </span>
          </div>

          {/* Lyric content */}
          <blockquote className="mb-4">
            {displayLines.map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">
                {line}
              </p>
            ))}
          </blockquote>

          {shouldTruncate && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors mt-2"
            >
              {expanded ? 'show less' : 'show more...'}
            </button>
          )}

          {/* Metadata footer */}
          <div className="mt-6 pt-4 border-t border-black/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-charcoal/30">
              {lyric.cover_art_url && (
                <div
                  className="w-8 h-8 flex-shrink-0 rounded"
                  style={{
                    backgroundImage: `url(${lyric.cover_art_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                />
              )}
              {(lyric.song_title || lyric.artist_name) && (
                <span>
                  {lyric.song_title && (
                    <Link
                      to={`/song/${encodeURIComponent(lyric.song_title.toLowerCase())}${lyric.artist_name ? `?artist=${encodeURIComponent(lyric.artist_name)}` : ''}`}
                      className="hover:text-charcoal/50 transition-colors"
                    >
                      {lyric.song_title}
                    </Link>
                  )}
                  {lyric.song_title && lyric.artist_name && <span> · </span>}
                  {lyric.artist_name && (
                    <Link
                      to={`/artist/${encodeURIComponent(lyric.artist_name.toLowerCase())}`}
                      className="hover:text-charcoal/50 transition-colors"
                    >
                      {lyric.artist_name}
                    </Link>
                  )}
                </span>
              )}
            </div>

            {lyric.tags && lyric.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {lyric.tags.map((tag, idx) => (
                  <Link
                    key={idx}
                    to={`/explore/tag/${encodeURIComponent(tag)}`}
                    className="text-xs text-charcoal/25 hover:text-charcoal/50 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Note editor */}
        <NoteEditor lyricId={lyric.id} initialNote={note} className="mt-4" />
      </div>
    </div>
  )
}

export default function History() {
  const { user } = useAuth()
  const { currentLyric } = useLyric()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select('*')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error fetching history:', error)
          setLyrics([])
        } else {
          const realLyrics = data || []
          realLyrics.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          setLyrics(realLyrics)

          if (realLyrics.length > 0) {
            const { data: notesData } = await supabase
              .from('lyric_notes')
              .select('*')
              .eq('user_id', user.id)

            if (notesData) {
              const notesMap = {}
              notesData.forEach(note => {
                notesMap[note.lyric_id] = note
              })
              setNotes(notesMap)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching history:', err)
        setLyrics([])
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  if (loading) {
    return (
      <div className="flex-1 w-full flex flex-col">
        <div className="max-w-lg mx-auto px-4 sm:px-6 pt-8 pb-12 w-full">
          <div className="skeleton h-6 w-32 mb-3" />
          <div className="skeleton h-3 w-20 mb-12" />
          {[1, 2, 3].map(i => (
            <div key={i} className="mb-8 p-6" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)', border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
              <div className="skeleton h-4 w-16 mb-4" />
              <div className="skeleton h-6 w-full mb-2" />
              <div className="skeleton h-6 w-3/4 mb-2" />
              <div className="skeleton h-6 w-1/2 mb-6" />
              <div className="skeleton h-3 w-32 mt-4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (lyrics.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-sm text-charcoal/40 leading-relaxed">
            Your moments will gather here
          </p>
          <p className="text-xs text-charcoal/25">
            Each lyric that moves through your mind leaves a trace
          </p>
        </div>
        <Link
          to="/home"
          className="mt-12 text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors lowercase"
        >
          ← now
        </Link>
      </div>
    )
  }

  // Separate current lyric from past lyrics
  const pastLyrics = currentLyric
    ? lyrics.filter(l => l.id !== currentLyric.id)
    : lyrics

  // Group past lyrics by month
  const monthGroups = groupByMonth(pastLyrics)

  // Running index for stagger animations
  let entryIndex = 0

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-8 pb-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1
            className="text-charcoal/50 lowercase"
            style={{ fontFamily: "'Caveat', cursive", fontSize: '1.5rem' }}
          >
            memory lane
          </h1>
          <span className="text-xs text-charcoal/30">
            {pastLyrics.length} {pastLyrics.length === 1 ? 'moment' : 'moments'}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 sm:px-6 pb-16">
          {/* Month-grouped past lyrics */}
          {monthGroups.map((group) => (
            <div key={group.label}>
              <MonthHeader title={group.label} />
              <div>
                {group.lyrics.map((lyric) => {
                  const idx = entryIndex++
                  return (
                    <TimelineEntry
                      key={lyric.id}
                      lyric={lyric}
                      note={notes[lyric.id]}
                      index={idx}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
