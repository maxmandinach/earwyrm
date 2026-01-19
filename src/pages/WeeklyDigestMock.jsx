import { useState } from 'react'
import { Link } from 'react-router-dom'
import { themes } from '../lib/themes'

// Mock digest data for testing
const mockDigest = {
  published_at: new Date().toISOString(),
  week_of: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  lyrics: [
    {
      id: 'mock-1',
      content: 'And I know that you mean so well, but I am not a vessel for your good intent',
      song_title: 'Liability',
      artist_name: 'Lorde',
      theme: 'default',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-2',
      content: 'I want to be alone, alone with you',
      song_title: 'Wash.',
      artist_name: 'Bon Iver',
      theme: 'serif',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-3',
      content: 'The only thing I ever learned from love was how to shoot somebody who outdrew ya',
      song_title: 'Hallelujah',
      artist_name: 'Leonard Cohen',
      theme: 'mono',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-4',
      content: 'I could be your anytime',
      song_title: 'I Know',
      artist_name: 'Fiona Apple',
      theme: 'typewriter',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-5',
      content: 'Time is a valuable thing, watch it fly by as the pendulum swings',
      song_title: 'In The End',
      artist_name: 'Linkin Park',
      theme: 'minimal',
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-6',
      content: 'I took the Jeep to the sand with a plan that involved a beverage',
      song_title: 'Golden',
      artist_name: 'Harry Styles',
      theme: 'serif',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-7',
      content: 'Your ex-lover is dead',
      song_title: 'Your Ex-Lover is Dead',
      artist_name: 'Stars',
      theme: 'mono',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-8',
      content: 'So this is the new year, and I don\'t feel any different',
      song_title: 'The New Year',
      artist_name: 'Death Cab for Cutie',
      theme: 'typewriter',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-9',
      content: 'What do you think I\'d see if I could walk away from me?',
      song_title: 'Tidal Wave',
      artist_name: 'Taking Back Sunday',
      theme: 'default',
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-10',
      content: 'But I\'m a creep, I\'m a weirdo',
      song_title: 'Creep',
      artist_name: 'Radiohead',
      theme: 'minimal',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

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

export default function WeeklyDigestMock() {
  const [showExplanation, setShowExplanation] = useState(false)
  const digest = mockDigest

  // Check if digest should be available (Sunday-Tuesday only)
  const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
  const isDigestAvailable = today >= 0 && today <= 2 // Sunday through Tuesday

  // Format the date range
  const publishedDate = new Date(digest.published_at)
  const weekStart = new Date(digest.week_of)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Calculate days until next Sunday
  const daysUntilSunday = (7 - today) % 7 || 7

  // Not available yet - show coming soon
  if (!isDigestAvailable) {
    return (
      <div className="flex-1 w-full flex flex-col overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-8 flex-shrink-0">
          <h1 className="text-2xl font-light text-charcoal tracking-tight mb-8">
            Last Week in Lyrics
          </h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
          <div className="text-center max-w-md">
            <p className="text-lg text-charcoal mb-3">
              New digest publishes every Sunday
            </p>
            <p className="text-sm text-charcoal-light mb-8">
              {daysUntilSunday === 1 ? 'Tomorrow' : `${daysUntilSunday} days`} until the next collection of lyrics from the past week
            </p>
            <button
              onClick={() => setShowExplanation(true)}
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors underline hover:no-underline"
            >
              What is this?
            </button>
          </div>
        </div>

        {showExplanation && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-cream max-w-md w-full">
              <div className="border-b border-charcoal/10 px-6 py-5">
                <h2 className="text-lg font-light text-charcoal tracking-tight">
                  What's the Weekly Digest?
                </h2>
              </div>
              <div className="px-6 py-6 space-y-4">
                <p className="text-sm text-charcoal leading-relaxed">
                  Every Sunday morning, we publish a curated collection of 15-20 lyrics that were shared during the previous week.
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-charcoal mb-1">Anonymous</p>
                    <p className="text-xs text-charcoal-light leading-relaxed">
                      No usernames, no profile links. Just the lyric, the song, and when it was shared.
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal mb-1">Random Selection</p>
                    <p className="text-xs text-charcoal-light leading-relaxed">
                      We randomly choose from all public lyrics. Everyone has an equal chance of being featured.
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal mb-1">Sunday–Tuesday Only</p>
                    <p className="text-xs text-charcoal-light leading-relaxed">
                      Each digest is available for a few days, then we prepare for next week. No endless scrolling.
                    </p>
                  </div>
                </div>
                <div className="bg-charcoal/5 px-4 py-3 border-l-2 border-charcoal/20 mt-6">
                  <p className="text-xs text-charcoal-light leading-relaxed">
                    A weekly magazine of moments that moved people—a way to discover new music through the lines that resonated.
                  </p>
                </div>
              </div>
              <div className="border-t border-charcoal/10 px-6 py-4 flex justify-end">
                <button
                  onClick={() => setShowExplanation(false)}
                  className="px-6 py-2 text-sm font-medium text-charcoal border border-charcoal/30
                           hover:border-charcoal/60 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8 flex-shrink-0">
        <h1 className="text-2xl font-light text-charcoal tracking-tight mb-4">
          Last Week in Lyrics
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-sm text-charcoal-light/60">
            {formatDate(weekStart)} – {formatDate(weekEnd)}, {publishedDate.getFullYear()}
          </p>
          <button
            onClick={() => setShowExplanation(true)}
            className="text-xs text-charcoal-light hover:text-charcoal transition-colors
                     underline hover:no-underline whitespace-nowrap"
          >
            What is this?
          </button>
        </div>
      </div>

      {/* Featured notification - if user's lyric is in this digest */}
      {/* TODO: Check if current user has a lyric in digest */}
      {false && ( // Change to true to test
        <div className="bg-charcoal text-cream px-4 py-3 border-b border-cream/10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm">
              ✨ Your lyric from this week is featured below
            </p>
          </div>
        </div>
      )}

      {/* Digest content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 pb-20">
          <p className="text-center text-sm text-charcoal-light mb-12">
            {digest.lyrics.length} {digest.lyrics.length === 1 ? 'moment' : 'moments'} from the past week
          </p>

          {/* Lyric cards */}
          <div className="space-y-12">
            {digest.lyrics.map((lyric) => (
              <DigestLyricCard key={lyric.id} lyric={lyric} />
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

      {/* Explanation modal */}
      {showExplanation && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cream max-w-md w-full">
            <div className="border-b border-charcoal/10 px-6 py-5">
              <h2 className="text-lg font-light text-charcoal tracking-tight">
                What's the Weekly Digest?
              </h2>
            </div>
            <div className="px-6 py-6 space-y-4">
              <p className="text-sm text-charcoal leading-relaxed">
                Every Sunday morning, we publish a curated collection of 15-20 lyrics that were shared during the previous week.
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-charcoal mb-1">Anonymous</p>
                  <p className="text-xs text-charcoal-light leading-relaxed">
                    No usernames, no profile links. Just the lyric, the song, and when it was shared.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal mb-1">Random Selection</p>
                  <p className="text-xs text-charcoal-light leading-relaxed">
                    We randomly choose from all public lyrics. Everyone has an equal chance of being featured.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal mb-1">Sunday–Tuesday Only</p>
                  <p className="text-xs text-charcoal-light leading-relaxed">
                    Each digest is available for a few days, then we prepare for next week. No endless scrolling.
                  </p>
                </div>
              </div>
              <div className="bg-charcoal/5 px-4 py-3 border-l-2 border-charcoal/20 mt-6">
                <p className="text-xs text-charcoal-light leading-relaxed">
                  A weekly magazine of moments that moved people—a way to discover new music through the lines that resonated.
                </p>
              </div>
            </div>
            <div className="border-t border-charcoal/10 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowExplanation(false)}
                className="px-6 py-2 text-sm font-medium text-charcoal border border-charcoal/30
                         hover:border-charcoal/60 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
