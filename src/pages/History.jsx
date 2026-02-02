import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'
import LyricCard from '../components/LyricCard'
import NoteEditor from '../components/NoteEditor'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../lib/utils'
import { signatureStyle } from '../lib/themes'

// Get season name from date
function getSeason(date) {
  const d = new Date(date)
  const month = d.getMonth()
  const year = d.getFullYear()

  let season
  if (month >= 2 && month <= 4) season = 'spring'
  else if (month >= 5 && month <= 7) season = 'summer'
  else if (month >= 8 && month <= 10) season = 'fall'
  else season = 'winter'

  return `${season} ${year}`
}

// Get month name from date
function getMonthName(date) {
  const d = new Date(date)
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december']
  return months[d.getMonth()]
}

// Format timestamp relative to section context
function formatTimestampForSection(dateString, section) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now - date
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  // For seasonal sections, show month name
  if (section === 'seasonal') {
    return getMonthName(date)
  }

  // For all other sections, show specific days
  if (diffInDays === 0) return 'today'
  if (diffInDays === 1) return 'yesterday'
  if (diffInDays < 14) return `${diffInDays} days ago`

  // For items in "this month" section (14-29 days), show weeks
  const weeks = Math.floor(diffInDays / 7)
  return `${weeks} weeks ago`
}

// Group lyrics by time periods for timeline
function groupLyricsByPeriod(lyrics) {
  const now = new Date()
  const groups = {
    thisWeek: [],
    lastWeek: [],
    thisMonth: [],
    earlier: []
  }

  lyrics.forEach(lyric => {
    const date = new Date(lyric.created_at)
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffInDays < 7) {
      groups.thisWeek.push(lyric)
    } else if (diffInDays < 14) {
      groups.lastWeek.push(lyric)
    } else if (diffInDays < 30) {
      groups.thisMonth.push(lyric)
    } else {
      groups.earlier.push(lyric)
    }
  })

  return groups
}


function TimePeriodHeader({ title }) {
  return (
    <div className="mb-12 mt-16 first:mt-0">
      {/* Calm chapter marker */}
      <h2 className="text-xs font-normal text-charcoal/40 tracking-wider lowercase">
        {title}
      </h2>
    </div>
  )
}

function TimelineEntry({ lyric, note, section = 'default' }) {
  const theme = signatureStyle
  const [expanded, setExpanded] = useState(false)

  // Unified card styling - matches LyricCard
  const cardStyle = {
    // Surface color from CSS variables
    backgroundColor: 'var(--surface-card, #F5F2ED)',
    // Typography
    color: 'var(--text-primary, #2C2825)',
    fontFamily: theme.fontFamily,
    fontSize: '1.5rem',
    fontWeight: theme.fontWeight,
    lineHeight: theme.lineHeight,
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
    // Depth - card floats above background
    boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08))',
    border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
  }

  const secondaryStyle = {
    color: theme.secondaryColor,
    fontFamily: theme.fontFamily,
  }

  // Split lyric into lines for preview
  const lines = lyric.content.split('\n')
  const shouldTruncate = lines.length > 3
  const displayLines = expanded || !shouldTruncate ? lines : lines.slice(0, 3)

  return (
    <div className="mb-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 fill-mode-backwards"
         style={{ animationDelay: '50ms' }}>
      {/* Memory card - paper texture with depth */}
      <div className="relative">
        <div>
          <div
            className="p-6"
            style={cardStyle}
          >
            {/* Lyric content - preview or full */}
            <div>
              <blockquote className="mb-4">
                {displayLines.map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {line}
                  </p>
                ))}
              </blockquote>

              {/* Expand/collapse for long lyrics */}
              {shouldTruncate && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors mt-2"
                >
                  {expanded ? 'show less' : 'show more...'}
                </button>
              )}
            </div>

            {/* Quiet metadata footer */}
            <div className="mt-6 pt-4 border-t border-black/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-xs text-charcoal/30">
                {formatTimestampForSection(lyric.created_at, section)}
                {(lyric.song_title || lyric.artist_name) && (
                  <span className="ml-3">
                    {lyric.song_title && (
                      <Link
                        to={`/explore/song/${encodeURIComponent(lyric.song_title)}`}
                        className="hover:text-charcoal/50 transition-colors"
                      >
                        {lyric.song_title}
                      </Link>
                    )}
                    {lyric.song_title && lyric.artist_name && <span> · </span>}
                    {lyric.artist_name && (
                      <Link
                        to={`/explore/artist/${encodeURIComponent(lyric.artist_name)}`}
                        className="hover:text-charcoal/50 transition-colors"
                      >
                        {lyric.artist_name}
                      </Link>
                    )}
                  </span>
                )}
              </div>

              {/* Quiet tags */}
              {lyric.tags && lyric.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lyric.tags.map((tag, index) => (
                    <Link
                      key={index}
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

          {/* Note - where interpretation lives */}
          <NoteEditor lyricId={lyric.id} initialNote={note} className="mt-4" />
        </div>
      </div>
    </div>
  )
}





export default function History() {
  const { user } = useAuth()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({}) // Map of lyricId -> note
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return

      setLoading(true)
      try {
        // Fetch lyrics
        const { data, error } = await supabase
          .from('lyrics')
          .select('*')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error fetching history:', error)
          setLyrics([])
        } else {
          const realLyrics = data || []
          // Sort client-side since our wrapper doesn't support .order()
          realLyrics.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          setLyrics(realLyrics)

          // Fetch notes for these lyrics
          if (realLyrics.length > 0) {
            const { data: notesData } = await supabase
              .from('lyric_notes')
              .select('*')
              .eq('user_id', user.id)

            if (notesData) {
              // Create a map of lyric_id -> note
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
        <div className="max-w-lg mx-auto px-4 sm:px-6 pt-16 pb-12 w-full">
          <div className="skeleton h-6 w-32 mb-3" />
          <div className="skeleton h-3 w-20 mb-12" />
          {[1, 2, 3].map(i => (
            <div key={i} className="mb-8 p-6" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)', border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
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
          to="/"
          className="mt-12 text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors lowercase"
        >
          ← now
        </Link>
      </div>
    )
  }

  // Group all lyrics by time period
  const groupedLyrics = groupLyricsByPeriod(lyrics)

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      {/* Quiet header */}
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-16 pb-12 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase">
            memory lane
          </h1>
          <Link
            to="/"
            className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors lowercase"
          >
            now
          </Link>
        </div>
        <p className="text-xs text-charcoal/30">
          {lyrics.length} {lyrics.length === 1 ? 'moment' : 'moments'}
        </p>
      </div>

      {/* Timeline - scrollable container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 sm:px-6 pb-16">
          {/* No timeline line - just gentle progression */}
          <div className="relative">
            {/* This Week */}
            {groupedLyrics.thisWeek.length > 0 && (
              <>
                <TimePeriodHeader title="this week" />
                <div className="space-y-0">
                  {groupedLyrics.thisWeek.map((lyric) => (
                    <TimelineEntry key={lyric.id} lyric={lyric} note={notes[lyric.id]} section="default" />
                  ))}
                </div>
              </>
            )}

            {/* Last Week */}
            {groupedLyrics.lastWeek.length > 0 && (
              <>
                <TimePeriodHeader title="last week" />
                <div className="space-y-0">
                  {groupedLyrics.lastWeek.map((lyric) => (
                    <TimelineEntry key={lyric.id} lyric={lyric} note={notes[lyric.id]} section="default" />
                  ))}
                </div>
              </>
            )}

            {/* This Month */}
            {groupedLyrics.thisMonth.length > 0 && (
              <>
                <TimePeriodHeader title="this month" />
                <div className="space-y-0">
                  {groupedLyrics.thisMonth.map((lyric) => (
                    <TimelineEntry key={lyric.id} lyric={lyric} note={notes[lyric.id]} section="default" />
                  ))}
                </div>
              </>
            )}

            {/* Earlier */}
            {groupedLyrics.earlier.length > 0 && (
              <>
                <TimePeriodHeader title="earlier" />
                <div className="space-y-0">
                  {groupedLyrics.earlier.map((lyric) => (
                    <TimelineEntry key={lyric.id} lyric={lyric} note={notes[lyric.id]} section="default" />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
