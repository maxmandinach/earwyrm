import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'
import LyricCard from '../components/LyricCard'
import NoteDisplay from '../components/NoteDisplay'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../lib/utils'
import { themes } from '../lib/themes'

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

// Development mode detection
const isDev = import.meta.env.DEV

// Mock data for testing
function generateMockLyrics() {
  const now = new Date()

  return [
    // Recent lyrics (last 30 days) - VISIBLE
    {
      id: 'mock-1',
      content: 'And I know that you mean so well, but I am not a vessel for your good intent',
      song_title: 'Liability',
      artist_name: 'Lorde',
      theme: 'default',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      is_current: false,
      is_public: false,
    },
    {
      id: 'mock-2',
      content: 'I want to be alone, alone with you',
      song_title: 'Wash.',
      artist_name: 'Bon Iver',
      theme: 'serif',
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      is_current: false,
      is_public: false,
    },
    {
      id: 'mock-3',
      content: 'The only thing I ever learned from love was how to shoot somebody who outdrew ya',
      song_title: 'Hallelujah',
      artist_name: 'Leonard Cohen',
      theme: 'mono',
      created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
      is_current: false,
      is_public: false,
    },
    {
      id: 'mock-4',
      content: 'I could be your anytime',
      song_title: 'I Know',
      artist_name: 'Fiona Apple',
      theme: 'typewriter',
      created_at: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks ago
      is_current: false,
      is_public: false,
    },
    {
      id: 'mock-5',
      content: 'Time is a valuable thing, watch it fly by as the pendulum swings',
      song_title: 'In The End',
      artist_name: 'Linkin Park',
      theme: 'minimal',
      created_at: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 weeks ago
      is_current: false,
      is_public: false,
    },

    // Old lyrics (31-90 days ago) - LOCKED/GHOST
    {
      id: 'mock-6',
      content: 'What do you think I\'d see if I could walk away from me?',
      song_title: 'Tidal Wave',
      artist_name: 'Taking Back Sunday',
      theme: 'default',
      created_at: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
      is_current: false,
      is_public: false,
    },
    {
      id: 'mock-7',
      content: 'I took the Jeep to the sand with a plan that involved a beverage',
      song_title: 'Golden',
      artist_name: 'Harry Styles',
      theme: 'serif',
      created_at: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
      is_current: false,
      is_public: false,
    },
    {
      id: 'mock-8',
      content: 'Your ex-lover is dead',
      song_title: 'Your Ex-Lover is Dead',
      artist_name: 'Stars',
      theme: 'mono',
      created_at: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString(), // 75 days ago
      is_current: false,
      is_public: false,
    },
    {
      id: 'mock-9',
      content: 'So this is the new year, and I don\'t feel any different',
      song_title: 'The New Year',
      artist_name: 'Death Cab for Cutie',
      theme: 'typewriter',
      created_at: new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000).toISOString(), // 85 days ago
      is_current: false,
      is_public: false,
    },
  ]
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

function TimelineEntry({ lyric, note, isLocked = false, section = 'default' }) {
  const theme = themes[lyric.theme] || themes.default
  const [expanded, setExpanded] = useState(false)

  const cardStyle = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: '0.9375rem',
    fontWeight: theme.fontWeight,
    lineHeight: '1.7',
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
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
      {/* Memory card - soft paper-like */}
      <div className={`relative ${isLocked ? 'opacity-50' : ''}`}>
        <div className={`max-w-2xl ${
          isLocked
            ? 'filter grayscale'
            : ''
        }`}>
          <div
            className={`p-8 rounded-sm transition-all duration-500 ${
              isLocked
                ? 'shadow-sm bg-charcoal/5'
                : 'shadow-md hover:shadow-xl bg-white'
            }`}
            style={isLocked ? {} : cardStyle}
          >
            {/* Lyric content - preview or full */}
            <div className={isLocked ? 'blur-sm' : ''}>
              <blockquote className="mb-4">
                {displayLines.map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {line}
                  </p>
                ))}
              </blockquote>

              {/* Expand/collapse for long lyrics */}
              {shouldTruncate && !isLocked && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors mt-2"
                >
                  {expanded ? 'show less' : 'show more...'}
                </button>
              )}
            </div>

            {/* Quiet metadata footer */}
            <div className="mt-6 pt-4 border-t border-black/5 flex items-center justify-between">
              <div className="text-xs text-charcoal/30">
                {formatTimestampForSection(lyric.created_at, section)}
                {(lyric.song_title || lyric.artist_name) && (
                  <span className="ml-3">
                    {lyric.song_title && <span>{lyric.song_title}</span>}
                    {lyric.song_title && lyric.artist_name && <span> · </span>}
                    {lyric.artist_name && <span>{lyric.artist_name}</span>}
                  </span>
                )}
              </div>

              {/* Quiet tags */}
              {lyric.tags && lyric.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lyric.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs text-charcoal/25"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Note - marginalia style */}
          {note && !isLocked && (
            <div className="mt-4">
              <NoteDisplay content={note.content} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PaywallBoundary({ lockedCount }) {
  return (
    <div className="my-16 max-w-2xl">
      {/* Memory gate - feels like a natural part of the timeline */}
      <div className="p-12 bg-white/50 backdrop-blur-sm rounded-sm shadow-md border border-charcoal/10">
        <div className="text-center space-y-6">
          {/* Gentle introduction */}
          <div className="space-y-2">
            <p className="text-sm text-charcoal/50 lowercase tracking-wide">
              older memories
            </p>
            <h3 className="text-xl font-light text-charcoal leading-relaxed">
              There's more here
            </h3>
          </div>

          {/* Memory-oriented copy */}
          <div className="space-y-3 max-w-md mx-auto">
            <p className="text-sm text-charcoal/60 leading-relaxed">
              You've been carrying these thoughts longer than you realized.
            </p>
            <p className="text-xs text-charcoal/40">
              {lockedCount} {lockedCount === 1 ? 'lyric' : 'lyrics'} preserved beyond 30 days
            </p>
          </div>

          {/* Clear but gentle CTA */}
          <div className="pt-4">
            <a
              href="#"
              className="inline-block px-8 py-3 text-sm text-charcoal border border-charcoal/30
                       hover:border-charcoal/60 hover:bg-charcoal/5 transition-all rounded-sm"
              onClick={(e) => {
                e.preventDefault()
                console.log('Upgrade clicked')
              }}
            >
              Keep your full history
            </a>
            <p className="text-xs text-charcoal/30 mt-3">
              Unlock everything, forever
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StickyUpgradeReminder({ lockedCount, visible }) {
  if (!visible) return null

  return (
    <div className="sticky top-0 z-20 bg-charcoal text-cream border-b border-cream/20
                    animate-in slide-in-from-top duration-300">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-cream/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-sm text-cream/90">
            <span className="font-medium">{lockedCount} more {lockedCount === 1 ? 'lyric' : 'lyrics'}</span> from your past
          </p>
        </div>
        <a
          href="#"
          className="text-sm text-cream font-medium hover:text-cream/80 transition-colors whitespace-nowrap"
          onClick={(e) => {
            e.preventDefault()
            console.log('Upgrade clicked from sticky banner')
          }}
        >
          Unlock →
        </a>
      </div>
    </div>
  )
}

function InlineTeaser({ lockedCount, season }) {
  return (
    <div className="relative flex gap-6 py-5 my-8">
      <div className="flex-shrink-0 w-4 flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-charcoal/20" />
      </div>
      <div className="flex-shrink-0 w-24" />
      <div className="flex-1 min-w-0">
        <div className="border-2 border-dashed border-charcoal/20 bg-charcoal/5 px-6 py-8 text-center">
          <p className="text-sm text-charcoal/60 mb-2">
            You also collected lyrics in <span className="font-medium">{season}</span>
          </p>
          <p className="text-xs text-charcoal/40 mb-4">
            {lockedCount} {lockedCount === 1 ? 'lyric' : 'lyrics'} waiting beyond 30 days
          </p>
          <a
            href="#"
            className="inline-block text-xs text-charcoal underline hover:no-underline"
            onClick={(e) => {
              e.preventDefault()
              console.log('Upgrade clicked from inline teaser')
            }}
          >
            See what you're missing
          </a>
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
  const [useMockData, setUseMockData] = useState(true) // Start with mock data enabled
  const [realDataExists, setRealDataExists] = useState(false)
  const [showStickyReminder, setShowStickyReminder] = useState(false)

  // For now, assume all users are free users (no payment integration yet)
  const isPaidUser = false

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return

      setLoading(true)
      try {
        // Use mock data if toggled on
        if (useMockData) {
          setLyrics(generateMockLyrics())
          setLoading(false)
          return
        }

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
          setRealDataExists(realLyrics.length > 0)
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
  }, [user, useMockData])

  // Scroll detection for sticky reminder
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky reminder after scrolling 800px (roughly past paywall)
      setShowStickyReminder(window.scrollY > 800)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-charcoal-light text-sm">Loading your history...</div>
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

  // Calculate 30-day cutoff
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Separate visible and locked lyrics
  const visibleLyrics = isPaidUser
    ? lyrics
    : lyrics.filter(lyric => new Date(lyric.created_at) >= thirtyDaysAgo)

  const lockedLyrics = isPaidUser
    ? []
    : lyrics.filter(lyric => new Date(lyric.created_at) < thirtyDaysAgo)

  // Take first 2 locked lyrics as teaser - just enough to create desire
  const ghostCards = lockedLyrics.slice(0, 2)

  // Group visible lyrics by time period
  const groupedLyrics = groupLyricsByPeriod(visibleLyrics)

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden" style={{ backgroundColor: '#FDFDFB' }}>
      {/* Sticky upgrade reminder - appears after scrolling past paywall */}
      {!isPaidUser && lockedLyrics.length > 0 && (
        <StickyUpgradeReminder lockedCount={lockedLyrics.length} visible={showStickyReminder} />
      )}

      {/* Quiet header */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-12 flex-shrink-0">
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
        <div className="flex items-center justify-between">
          <p className="text-xs text-charcoal/30">
            {visibleLyrics.length} {visibleLyrics.length === 1 ? 'moment' : 'moments'}
          </p>
          {isDev && (
            <button
              onClick={() => setUseMockData(!useMockData)}
              className="text-xs px-3 py-1.5 border border-charcoal/20 hover:border-charcoal/40
                         transition-colors text-charcoal/30 rounded-sm"
              title="Toggle mock data for testing"
            >
              {useMockData ? '✕ mock' : '+ mock'}
            </button>
          )}
        </div>
      </div>

      {/* Timeline - scrollable container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 pb-16">
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

            {/* Earlier (within 30 days but older) */}
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

            {/* Locked content section - paywall as natural boundary */}
            {lockedLyrics.length > 0 && (
              <div className="relative mt-20">
                {/* Paywall appears inline */}
                <PaywallBoundary lockedCount={lockedLyrics.length} />

                {/* Faded previews below - hint at presence */}
                <div className="mt-12 space-y-8 opacity-30 pointer-events-none">
                  <TimePeriodHeader title={getSeason(lockedLyrics[0].created_at)} />
                  {ghostCards.map((lyric) => (
                    <TimelineEntry key={lyric.id} lyric={lyric} note={notes[lyric.id]} isLocked={true} section="seasonal" />
                  ))}

                  {/* Subtle indicator of more */}
                  {lockedLyrics.length > 2 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-charcoal/20">
                        + {lockedLyrics.length - 2} more memories
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
