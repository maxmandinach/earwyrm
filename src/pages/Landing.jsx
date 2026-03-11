import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { signatureStyle } from '../lib/themes'
import PlusBadge from '../components/PlusBadge'

const CYCLE_INTERVAL = 5000
const FADE_DURATION = 500

// Detect mobile platform for smart store links
function getDevicePlatform() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

// Placeholder store URLs — update when live
const STORE_URLS = {
  ios: 'https://apps.apple.com/app/earwyrm/id000000000',
  android: 'https://play.google.com/store/apps/details?id=app.earwyrm',
}

export default function Landing() {
  const [lyrics, setLyrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const platform = useRef(getDevicePlatform()).current
  const isMobile = platform === 'ios' || platform === 'android'

  useEffect(() => {
    async function fetchFeaturedLyrics() {
      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select(`
            *,
            profiles:user_id(username, subscription_tier),
            lyric_notes(content, note_types)
          `)
          .eq('is_public', true)
          .order('reaction_count', { ascending: false })
          .limit(6)

        if (error) throw error
        setLyrics(data || [])
      } catch (err) {
        console.error('Error fetching featured lyrics:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFeaturedLyrics()
  }, [])

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setRevealed(true), 150)
      return () => clearTimeout(timer)
    }
  }, [loading])

  // Auto-cycle
  const advance = useCallback(() => {
    if (lyrics.length <= 1) return
    setFading(true)
    setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % lyrics.length)
      setFading(false)
    }, FADE_DURATION)
  }, [lyrics.length])

  useEffect(() => {
    if (lyrics.length <= 1) return
    const interval = setInterval(advance, CYCLE_INTERVAL)
    return () => clearInterval(interval)
  }, [advance, lyrics.length])

  // Swipe
  const touchStartX = useRef(null)
  const swipeTo = useCallback((direction) => {
    if (lyrics.length <= 1 || fading) return
    setFading(true)
    setTimeout(() => {
      setActiveIndex((prev) =>
        direction === 'left'
          ? (prev + 1) % lyrics.length
          : (prev - 1 + lyrics.length) % lyrics.length
      )
      setFading(false)
    }, FADE_DURATION)
  }, [lyrics.length, fading])

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    touchStartX.current = null
    if (Math.abs(diff) > 50) swipeTo(diff > 0 ? 'left' : 'right')
  }, [swipeTo])

  const theme = signatureStyle
  const activeLyric = lyrics[activeIndex]

  const cardStyle = {
    backgroundColor: 'var(--surface-card, #F5F2ED)',
    color: 'var(--text-primary, #2C2825)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.1)',
    border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex justify-between items-center">
        <span
          style={{ fontFamily: "'Caveat', cursive", fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary, #2C2825)' }}
        >
          earwyrm
        </span>
        <div className="flex items-center gap-4">
          <Link
            to="/explore"
            className="text-sm text-charcoal/40 hover:text-charcoal transition-colors hidden sm:inline"
          >
            Browse
          </Link>
          <Link
            to="/login"
            className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        {/* Tagline */}
        <div
          className="text-center mb-8 transition-all duration-700 ease-out"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(16px)',
          }}
        >
          <h1
            className="text-3xl sm:text-4xl md:text-5xl text-charcoal mb-3"
            style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, lineHeight: 1.2 }}
          >
            Save the lines that<br />stay with you.
          </h1>
          <p
            className="text-sm sm:text-base text-charcoal/40 max-w-sm mx-auto leading-relaxed mt-4"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            A journal for the lyrics stuck in your head.
            {!isMobile && ' Share what resonates. See what moves others.'}
          </p>
        </div>

        {/* Rotating lyric card */}
        {!loading && activeLyric && (
          <div
            className="w-full max-w-md mb-10 transition-all duration-700 ease-out touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(20px)',
              transitionDelay: '200ms',
            }}
          >
            <div className="relative" style={{ minHeight: '160px' }}>
              <div
                className="p-6 sm:p-8 transition-opacity ease-in-out"
                style={{
                  ...cardStyle,
                  opacity: fading ? 0 : 1,
                  transitionDuration: `${FADE_DURATION}ms`,
                }}
              >
                <blockquote
                  className="leading-relaxed"
                  style={{
                    fontFamily: theme.fontFamily,
                    fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
                    fontWeight: theme.fontWeight,
                    lineHeight: 1.55,
                  }}
                >
                  {activeLyric.content}
                </blockquote>

                {(activeLyric.song_title || activeLyric.artist_name) && (
                  <>
                    <div
                      className="w-14 mt-4 mb-3"
                      style={{
                        height: '1.5px',
                        backgroundColor: 'var(--color-accent, #B8A99A)',
                        opacity: 0.5,
                      }}
                    />
                    <div className="flex items-center gap-3">
                      {activeLyric.cover_art_url && (
                        <div
                          className="w-9 h-9 flex-shrink-0 rounded"
                          style={{
                            backgroundImage: `url(${activeLyric.cover_art_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          }}
                        />
                      )}
                      <p
                        className="text-sm"
                        style={{
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                          fontStyle: 'italic',
                          color: 'var(--text-secondary, #6B635A)',
                        }}
                      >
                        {activeLyric.song_title}
                        {activeLyric.song_title && activeLyric.artist_name && ' — '}
                        {activeLyric.artist_name}
                      </p>
                    </div>
                  </>
                )}

                {activeLyric.lyric_notes?.[0] && (
                  <div
                    className="mt-4 pt-3 border-t border-charcoal/8"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  >
                    <p className="text-sm leading-relaxed text-charcoal/50 line-clamp-2 italic">
                      "{activeLyric.lyric_notes[0].content}"
                    </p>
                  </div>
                )}

                <p
                  className="mt-3 text-xs text-charcoal/25"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  @{activeLyric.profiles?.username || 'anonymous'}
                  {activeLyric.profiles?.subscription_tier === 'plus' && <PlusBadge />}
                </p>
              </div>
            </div>

            {/* Dots */}
            {lyrics.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-5">
                {lyrics.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (i === activeIndex || fading) return
                      setFading(true)
                      setTimeout(() => {
                        setActiveIndex(i)
                        setFading(false)
                      }, FADE_DURATION)
                    }}
                    className="transition-all duration-300"
                    style={{
                      width: i === activeIndex ? '18px' : '5px',
                      height: '5px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--color-accent, #B8A99A)',
                      opacity: i === activeIndex ? 0.7 : 0.25,
                    }}
                    aria-label={`Show lyric ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CTAs */}
        <div
          className="flex flex-col items-center gap-5 transition-all duration-700 ease-out"
          style={{
            opacity: revealed ? 1 : 0,
            transitionDelay: '400ms',
          }}
        >
          {/* App store badges */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Show primary badge for current platform, both on desktop */}
            {(platform === 'ios' || platform === 'desktop') && (
              <a
                href={STORE_URLS.ios}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-6 py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--text-primary, #2C2825)',
                  color: 'var(--surface-bg, #FAF8F5)',
                }}
              >
                <svg width="20" height="24" viewBox="0 0 20 24" fill="currentColor">
                  <path d="M15.77 12.77c-.03-2.96 2.42-4.39 2.53-4.46-1.38-2.01-3.52-2.29-4.28-2.32-1.82-.19-3.56 1.07-4.48 1.07-.93 0-2.36-1.05-3.88-1.02-2 .03-3.84 1.16-4.87 2.95-2.08 3.6-.53 8.94 1.49 11.87 1 1.43 2.18 3.05 3.73 2.99 1.5-.06 2.06-.96 3.87-.96s2.32.96 3.9.93c1.61-.03 2.63-1.46 3.61-2.9 1.14-1.66 1.61-3.27 1.64-3.35-.04-.02-3.14-1.2-3.17-4.78zM12.84 4.05c.82-1 1.38-2.39 1.23-3.77-1.18.05-2.62.79-3.47 1.78-.76.88-1.42 2.28-1.25 3.63 1.32.1 2.67-.67 3.49-1.64z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] opacity-70 leading-none">Download on the</div>
                  <div className="text-sm font-medium leading-tight">App Store</div>
                </div>
              </a>
            )}
            {(platform === 'android' || platform === 'desktop') && (
              <a
                href={STORE_URLS.android}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-6 py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--text-primary, #2C2825)',
                  color: 'var(--surface-bg, #FAF8F5)',
                }}
              >
                <svg width="20" height="22" viewBox="0 0 20 22" fill="currentColor">
                  <path d="M1.21 0.41L11.09 10.5L1.21 20.59C0.86 20.18 0.66 19.62 0.66 18.97V2.03C0.66 1.38 0.86 0.82 1.21 0.41ZM14.08 7.46L3.03 1.09L11.82 10.04L14.08 7.46ZM14.08 13.54L11.82 10.96L3.03 19.91L14.08 13.54ZM17.6 9.38C18.12 9.71 18.5 10.09 18.5 10.5C18.5 10.91 18.12 11.29 17.6 11.62L15.37 12.91L12.87 10.5L15.37 8.09L17.6 9.38Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] opacity-70 leading-none">Get it on</div>
                  <div className="text-sm font-medium leading-tight">Google Play</div>
                </div>
              </a>
            )}
          </div>

          {/* Desktop secondary: browse on web */}
          {!isMobile && (
            <div className="flex items-center gap-3 mt-1">
              <div className="h-px w-8" style={{ backgroundColor: 'var(--text-primary, #2C2825)', opacity: 0.12 }} />
              <Link
                to="/explore"
                className="text-sm text-charcoal/35 hover:text-charcoal/60 transition-colors"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                or browse on the web
              </Link>
              <div className="h-px w-8" style={{ backgroundColor: 'var(--text-primary, #2C2825)', opacity: 0.12 }} />
            </div>
          )}
        </div>
      </div>

      {/* Feature section — below the fold */}
      <div
        className="border-t border-charcoal/6 py-16 sm:py-24 px-6 transition-opacity duration-700 ease-out"
        style={{ backgroundColor: 'var(--surface-bg, #FAF8F5)', opacity: revealed ? 1 : 0 }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="space-y-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-12">
            {[
              {
                title: 'Capture the moment',
                desc: 'When a lyric won\'t leave your head, save it. Add why it matters to you.',
              },
              {
                title: 'See what resonates',
                desc: 'Browse what others are feeling. Same song, different stories.',
              },
              {
                title: 'Build your collection',
                desc: 'Your lyrics grow into a musical diary. Follow artists and friends.',
              },
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-2xl mb-4 mx-auto w-10 h-10 flex items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'var(--surface-card, #F5F2ED)',
                    fontFamily: "'Caveat', cursive",
                    fontWeight: 600,
                    color: 'var(--color-accent, #B8A99A)',
                  }}
                >
                  {i + 1}
                </div>
                <h3
                  className="text-sm font-medium text-charcoal mb-2 lowercase"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm text-charcoal/40 leading-relaxed max-w-[220px] mx-auto"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-6 border-t border-charcoal/10">
        <div className="flex items-center justify-center gap-4 text-sm sm:text-xs text-charcoal/30">
          <Link to="/privacy" className="py-3 sm:py-0 hover:text-charcoal transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link to="/terms" className="py-3 sm:py-0 hover:text-charcoal transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  )
}
