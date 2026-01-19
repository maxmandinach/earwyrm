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
    <div className="relative flex items-center gap-6 mb-8 mt-12 first:mt-0">
      {/* Timeline marker - larger, more prominent */}
      <div className="flex-shrink-0 w-4 h-4 rounded-full bg-charcoal/40 relative z-10 ring-4 ring-cream" />

      {/* Period title - larger and bolder */}
      <h2 className="text-base font-semibold text-charcoal tracking-wide">
        {title}
      </h2>

      {/* Decorative line */}
      <div className="flex-1 h-px bg-charcoal/20" />
    </div>
  )
}

function TimelineEntry({ lyric, note, isLocked = false, section = 'default' }) {
  const theme = themes[lyric.theme] || themes.default

  const cardStyle = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: '0.875rem',
    fontWeight: theme.fontWeight,
    lineHeight: '1.5',
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
  }

  const secondaryStyle = {
    color: theme.secondaryColor,
    fontFamily: theme.fontFamily,
  }

  return (
    <div className="relative flex gap-6 group py-5">
      {/* Timeline connector */}
      <div className="flex-shrink-0 w-4 flex flex-col items-center">
        {/* Dot - larger and more prominent */}
        <div className={`w-3 h-3 rounded-full transition-all ${
          isLocked
            ? 'bg-charcoal/15'
            : 'bg-charcoal/40 group-hover:bg-charcoal/60 group-hover:scale-125'
        }`} />
      </div>

      {/* Timestamp - positioned along timeline, larger and bolder */}
      <div className="flex-shrink-0 w-24 pt-0.5">
        <p className={`text-sm font-medium tabular-nums transition-colors ${
          isLocked
            ? 'text-charcoal-light/40'
            : 'text-charcoal-light/70 group-hover:text-charcoal'
        }`}>
          {formatTimestampForSection(lyric.created_at, section)}
        </p>
      </div>

      {/* Lyric card - compact inline version */}
      <div className="flex-1 min-w-0">
        <div className={isLocked ? 'blur-md opacity-30 pointer-events-none select-none' : ''}>
          <div className="w-full p-4" style={cardStyle}>
            <blockquote className="mb-2">
              {lyric.content}
            </blockquote>

            {(lyric.song_title || lyric.artist_name) && (
              <p className="text-xs mt-1.5" style={secondaryStyle}>
                {lyric.song_title && <span>{lyric.song_title}</span>}
                {lyric.song_title && lyric.artist_name && <span> — </span>}
                {lyric.artist_name && <span>{lyric.artist_name}</span>}
              </p>
            )}

            {/* Tags - if present */}
            {lyric.tags && lyric.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {lyric.tags.map((tag, index) => (
                  <span key={index} className="text-xs opacity-60" style={secondaryStyle}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Note - displayed subtly outside the card */}
          {note && !isLocked && (
            <NoteDisplay content={note.content} />
          )}
        </div>
      </div>
    </div>
  )
}

function PaywallBoundary({ lockedCount }) {
  return (
    <div className="relative my-16">
      {/* Visual barrier - thick horizontal line with gradient */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-transparent via-charcoal/30 to-transparent" />

      {/* Paywall message - distinct box that breaks from timeline */}
      <div className="relative mx-auto max-w-2xl">
        <div className="bg-charcoal text-cream px-8 py-10 shadow-2xl relative">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-cream/20" />
          <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-cream/20" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-cream/20" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-cream/20" />

          <div className="text-center relative z-10">
            <div className="w-16 h-px bg-cream/30 mx-auto mb-6" />
            <p className="text-xl font-light leading-relaxed mb-2">
              Your journey continues with Premium
            </p>
            <p className="text-sm text-cream/70 mb-2 max-w-md mx-auto">
              {lockedCount} {lockedCount === 1 ? 'lyric' : 'lyrics'} preserved beyond 30 days. Your memories shouldn't disappear.
            </p>
            <p className="text-xs text-cream/50 mb-8">
              Unlock your full history forever
            </p>
            <a
              href="#"
              className="inline-block px-6 py-3 border-2 border-cream text-cream font-medium
                       hover:bg-cream hover:text-charcoal transition-all"
              onClick={(e) => {
                e.preventDefault()
                // TODO: Link to upgrade/pricing page when built
                console.log('Upgrade clicked')
              }}
            >
              Upgrade to Premium
            </a>
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
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <p className="text-lg text-charcoal-light text-center max-w-md mb-8">
          Your history will appear here as you collect lyrics over time.
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
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      {/* Sticky upgrade reminder - appears after scrolling past paywall */}
      {!isPaidUser && lockedLyrics.length > 0 && (
        <StickyUpgradeReminder lockedCount={lockedLyrics.length} visible={showStickyReminder} />
      )}

      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-light text-charcoal tracking-tight">Your History</h1>
          <Link
            to="/"
            className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
          >
            Current
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-charcoal-light/60">
            {visibleLyrics.length} {visibleLyrics.length === 1 ? 'lyric' : 'lyrics'} collected
          </p>
          <button
            onClick={() => setUseMockData(!useMockData)}
            className="text-xs px-3 py-2 border border-charcoal/30 hover:border-charcoal/60
                       transition-colors text-charcoal-light rounded"
            title="Toggle mock data for testing"
          >
            {useMockData ? '✕ Mock' : '+ Mock'}
          </button>
        </div>
        {useMockData && (
          <p className="text-xs text-charcoal-light/40 mt-2">Showing mock data for testing</p>
        )}
      </div>

      {/* Timeline - scrollable container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 pb-8">
        {/* Vertical timeline line - prominent and thick */}
        <div className="relative">
          <div className="absolute left-[6px] top-0 bottom-0 w-1 bg-gradient-to-b from-charcoal/30 via-charcoal/20 to-charcoal/10 rounded-full"
               style={{ marginLeft: '0' }} />

          <div className="relative pl-0">
            {/* This Week */}
            {groupedLyrics.thisWeek.length > 0 && (
              <>
                <TimePeriodHeader title="this week" />
                <div className="space-y-2 mb-6">
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
                <div className="space-y-2 mb-6">
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
                <div className="space-y-2 mb-6">
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
                <div className="space-y-2 mb-6">
                  {groupedLyrics.earlier.map((lyric) => (
                    <TimelineEntry key={lyric.id} lyric={lyric} note={notes[lyric.id]} section="default" />
                  ))}
                </div>

                {/* Inline teaser if there's locked content - creates curiosity */}
                {!isPaidUser && lockedLyrics.length > 0 && (
                  <InlineTeaser
                    lockedCount={lockedLyrics.length}
                    season={getSeason(lockedLyrics[0].created_at)}
                  />
                )}
              </>
            )}

            {/* Locked content section - SHOW VALUE FIRST, THEN ASK */}
            {ghostCards.length > 0 && (
              <div className="relative mt-6">
                {/* First: Show what they're missing - locked period header */}
                <TimePeriodHeader title={getSeason(ghostCards[0].created_at)} />

                {/* Ghost timeline entries - just 2 as teaser to create desire */}
                <div className="space-y-2 relative mb-6">
                  {ghostCards.map((lyric) => (
                    <TimelineEntry key={lyric.id} lyric={lyric} note={notes[lyric.id]} isLocked={true} section="seasonal" />
                  ))}
                </div>

                {/* Then: Make the ask - paywall boundary */}
                <PaywallBoundary lockedCount={lockedLyrics.length} />
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
