import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { signatureStyle } from '../lib/themes'
import { applyColorScheme } from '../lib/paperTexture'
import { getDevicePlatform, STORE_URLS } from '../lib/utils'
import PlusBadge from '../components/PlusBadge'

const CYCLE_INTERVAL = 5000
const FADE_DURATION = 500

// Reusable store badge
function StoreBadge({ platform: p, size = 'default' }) {
  const isSmall = size === 'small'
  if (p === 'ios') return (
    <a
      href={STORE_URLS.ios}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${isSmall ? 'px-5 py-2.5' : 'px-7 py-3.5'}`}
      style={{ backgroundColor: 'var(--text-primary, #2C2825)', color: 'var(--surface-bg, #FAF8F5)' }}
    >
      <svg width={isSmall ? '16' : '20'} height={isSmall ? '19' : '24'} viewBox="0 0 20 24" fill="currentColor">
        <path d="M15.77 12.77c-.03-2.96 2.42-4.39 2.53-4.46-1.38-2.01-3.52-2.29-4.28-2.32-1.82-.19-3.56 1.07-4.48 1.07-.93 0-2.36-1.05-3.88-1.02-2 .03-3.84 1.16-4.87 2.95-2.08 3.6-.53 8.94 1.49 11.87 1 1.43 2.18 3.05 3.73 2.99 1.5-.06 2.06-.96 3.87-.96s2.32.96 3.9.93c1.61-.03 2.63-1.46 3.61-2.9 1.14-1.66 1.61-3.27 1.64-3.35-.04-.02-3.14-1.2-3.17-4.78zM12.84 4.05c.82-1 1.38-2.39 1.23-3.77-1.18.05-2.62.79-3.47 1.78-.76.88-1.42 2.28-1.25 3.63 1.32.1 2.67-.67 3.49-1.64z"/>
      </svg>
      <div className="text-left">
        <div className={`opacity-60 leading-none ${isSmall ? 'text-[9px]' : 'text-[10px]'}`}>Download on the</div>
        <div className={`font-medium leading-tight ${isSmall ? 'text-xs' : 'text-sm'}`}>App Store</div>
      </div>
    </a>
  )
  return (
    <a
      href={STORE_URLS.android}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${isSmall ? 'px-5 py-2.5' : 'px-7 py-3.5'}`}
      style={{ backgroundColor: 'var(--text-primary, #2C2825)', color: 'var(--surface-bg, #FAF8F5)' }}
    >
      <svg width={isSmall ? '16' : '20'} height={isSmall ? '18' : '22'} viewBox="0 0 20 22" fill="currentColor">
        <path d="M1.21 0.41L11.09 10.5L1.21 20.59C0.86 20.18 0.66 19.62 0.66 18.97V2.03C0.66 1.38 0.86 0.82 1.21 0.41ZM14.08 7.46L3.03 1.09L11.82 10.04L14.08 7.46ZM14.08 13.54L11.82 10.96L3.03 19.91L14.08 13.54ZM17.6 9.38C18.12 9.71 18.5 10.09 18.5 10.5C18.5 10.91 18.12 11.29 17.6 11.62L15.37 12.91L12.87 10.5L15.37 8.09L17.6 9.38Z"/>
      </svg>
      <div className="text-left">
        <div className={`opacity-60 leading-none ${isSmall ? 'text-[9px]' : 'text-[10px]'}`}>Get it on</div>
        <div className={`font-medium leading-tight ${isSmall ? 'text-xs' : 'text-sm'}`}>Google Play</div>
      </div>
    </a>
  )
}

// Scroll-reveal hook
function useReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function RevealSection({ children, className = '', delay = 0, style = {} }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.8s ease-out ${delay}ms, transform 0.8s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export default function Landing() {
  const [lyrics, setLyrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const platform = useRef(getDevicePlatform()).current
  const isMobile = platform === 'ios' || platform === 'android'

  // Force light mode on landing page
  useEffect(() => {
    const prevTheme = localStorage.getItem('earwyrm-theme')
    applyColorScheme('light')
    return () => {
      // Restore user's preference when leaving
      const pref = prevTheme || 'auto'
      if (pref === 'auto') {
        const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
        applyColorScheme(isDark ? 'dark' : 'light')
      } else {
        applyColorScheme(pref)
      }
    }
  }, [])

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

  const dmSans = "'DM Sans', system-ui, sans-serif"
  const caveat = "'Caveat', cursive"

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--surface-bg, #FAF8F5)' }}>

      {/* ── Header ── */}
      <header className="px-6 py-5 flex justify-between items-center relative z-10">
        <span style={{ fontFamily: caveat, fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary, #2C2825)' }}>
          earwyrm
        </span>
        <div className="flex items-center gap-5">
          <Link to="/explore" className="text-sm text-charcoal/35 hover:text-charcoal/70 transition-colors hidden sm:inline" style={{ fontFamily: dmSans }}>
            Explore
          </Link>
          <Link to="/login" className="text-sm text-charcoal/45 hover:text-charcoal transition-colors" style={{ fontFamily: dmSans }}>
            Sign in
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 pb-16 pt-4 sm:pt-0">
        {/* Headline */}
        <div
          className="text-center mb-10 transition-all duration-1000 ease-out"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <h1
            className="text-4xl sm:text-5xl md:text-6xl text-charcoal leading-[1.15]"
            style={{ fontFamily: caveat, fontWeight: 600 }}
          >
            The lyrics stay with you.<br />
            <span style={{ color: 'var(--color-accent, #B8A99A)' }}>Save the feeling.</span>
          </h1>
          <p
            className="text-charcoal/40 max-w-md mx-auto leading-relaxed mt-5 text-base sm:text-lg"
            style={{ fontFamily: dmSans }}
          >
            Save the lines stuck in your head. Add your story.
            Share them as art.
          </p>
        </div>

        {/* Rotating lyric card */}
        {!loading && activeLyric && (
          <div
            className="w-full max-w-md mb-12 transition-all duration-1000 ease-out touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0) rotate(0deg)' : 'translateY(24px) rotate(-0.5deg)',
              transitionDelay: '250ms',
            }}
          >
            <div className="relative" style={{ minHeight: '160px' }}>
              <div
                className="p-7 sm:p-9 transition-opacity ease-in-out"
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
                    fontSize: 'clamp(1.15rem, 3.5vw, 1.55rem)',
                    fontWeight: theme.fontWeight,
                    lineHeight: 1.6,
                  }}
                >
                  {activeLyric.content}
                </blockquote>

                {(activeLyric.song_title || activeLyric.artist_name) && (
                  <>
                    <div
                      className="w-12 mt-5 mb-3"
                      style={{ height: '1.5px', backgroundColor: 'var(--color-accent, #B8A99A)', opacity: 0.45 }}
                    />
                    <div className="flex items-center gap-3">
                      {activeLyric.cover_art_url && (
                        <div
                          className="w-9 h-9 flex-shrink-0 rounded"
                          style={{
                            backgroundImage: `url(${activeLyric.cover_art_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                          }}
                        />
                      )}
                      <p className="text-sm" style={{ fontFamily: dmSans, fontStyle: 'italic', color: 'var(--text-secondary, #6B635A)' }}>
                        {activeLyric.song_title}
                        {activeLyric.song_title && activeLyric.artist_name && ' — '}
                        {activeLyric.artist_name}
                      </p>
                    </div>
                  </>
                )}

                {activeLyric.lyric_notes?.[0] && (
                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.05))' }}>
                    <p className="text-sm leading-relaxed text-charcoal/45 line-clamp-2" style={{ fontFamily: dmSans, fontStyle: 'italic' }}>
                      "{activeLyric.lyric_notes[0].content}"
                    </p>
                  </div>
                )}

                <p className="mt-3 text-xs text-charcoal/20" style={{ fontFamily: dmSans }}>
                  @{activeLyric.profiles?.username || 'anonymous'}
                  {activeLyric.profiles?.subscription_tier === 'plus' && <PlusBadge />}
                </p>
              </div>
            </div>

            {lyrics.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-5">
                {lyrics.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (i === activeIndex || fading) return
                      setFading(true)
                      setTimeout(() => { setActiveIndex(i); setFading(false) }, FADE_DURATION)
                    }}
                    className="transition-all duration-300"
                    style={{
                      width: i === activeIndex ? '18px' : '5px',
                      height: '5px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--color-accent, #B8A99A)',
                      opacity: i === activeIndex ? 0.65 : 0.2,
                    }}
                    aria-label={`Show lyric ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Download CTAs */}
        <div
          className="flex flex-col items-center gap-4 transition-all duration-700 ease-out"
          style={{ opacity: revealed ? 1 : 0, transitionDelay: '500ms' }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {(platform === 'ios' || platform === 'desktop') && <StoreBadge platform="ios" />}
            {(platform === 'android' || platform === 'desktop') && <StoreBadge platform="android" />}
          </div>

          {!isMobile && (
            <div className="flex items-center gap-3 mt-1">
              <div className="h-px w-8" style={{ backgroundColor: 'var(--color-accent, #B8A99A)', opacity: 0.25 }} />
              <Link to="/explore" className="text-sm text-charcoal/30 hover:text-charcoal/55 transition-colors" style={{ fontFamily: dmSans }}>
                or explore on the web
              </Link>
              <div className="h-px w-8" style={{ backgroundColor: 'var(--color-accent, #B8A99A)', opacity: 0.25 }} />
            </div>
          )}
        </div>
      </section>

      {/* ── Section: Your story, your lyrics ── */}
      <section className="py-20 sm:py-28 px-6" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)' }}>
        <div className="max-w-2xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl text-charcoal mb-4" style={{ fontFamily: caveat, fontWeight: 600, lineHeight: 1.2 }}>
              More than lyrics.<br />Your story behind them.
            </h2>
            <p className="text-charcoal/40 max-w-md mx-auto leading-relaxed" style={{ fontFamily: dmSans }}>
              Every lyric means something different to every person.
              Add your note — the memory, the feeling, the reason it won't leave.
            </p>
          </RevealSection>

          <RevealSection delay={150}>
            {/* Mock note card */}
            <div className="max-w-sm mx-auto p-6 sm:p-7" style={cardStyle}>
              <blockquote className="leading-relaxed text-charcoal/80" style={{ fontFamily: caveat, fontSize: '1.3rem', lineHeight: 1.5 }}>
                I feed from the bottom, you feed from the top
                <br />I live upon morsels you happen to drop
              </blockquote>
              <div className="w-10 mt-4 mb-2.5" style={{ height: '1.5px', backgroundColor: 'var(--color-accent, #B8A99A)', opacity: 0.4 }} />
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 flex-shrink-0 rounded"
                  style={{
                    backgroundImage: 'url(https://images.genius.com/339ed236aa47b78ba5675177f037386f.300x301x1.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                  }}
                />
                <p className="text-xs text-charcoal/40" style={{ fontFamily: dmSans, fontStyle: 'italic' }}>
                  Theme from the Bottom — Phish
                </p>
              </div>
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.05))' }}>
                <p className="text-sm text-charcoal/45 leading-relaxed" style={{ fontFamily: dmSans, fontStyle: 'italic' }}>
                  "This song makes me think of the first time I saw Trey Anastasio
                  perform live. We were in the balcony. The second he played the
                  first note was magical — it gave me the chills."
                </p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── Section: AI Art ── */}
      <section className="py-20 sm:py-28 px-6" style={{ backgroundColor: 'var(--surface-bg, #FAF8F5)' }}>
        <div className="max-w-2xl mx-auto">
          <RevealSection className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-charcoal/25 mb-4" style={{ fontFamily: dmSans, fontWeight: 500 }}>
              earwyrm+
            </p>
            <h2 className="text-3xl sm:text-4xl text-charcoal mb-4" style={{ fontFamily: caveat, fontWeight: 600, lineHeight: 1.2 }}>
              Share what the music means to you.
            </h2>
            <p className="text-charcoal/40 max-w-lg mx-auto leading-relaxed" style={{ fontFamily: dmSans }}>
              AI reads your personal note — the memory, the mood,
              the meaning — and creates shareable art that captures
              your connection to the song. Painterly. Warm. Yours.
            </p>
          </RevealSection>

          <RevealSection delay={150}>
            {/* Note → Art flow */}
            <div className="max-w-xs mx-auto mb-5">
              {/* Mock note */}
              <div
                className="p-4 sm:p-5"
                style={{
                  ...cardStyle,
                  borderLeft: '3px solid var(--color-accent, #B8A99A)',
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-charcoal/25 mb-2" style={{ fontFamily: dmSans, fontWeight: 500 }}>
                  your note
                </p>
                <p className="text-sm text-charcoal/50 leading-relaxed" style={{ fontFamily: dmSans, fontStyle: 'italic' }}>
                  "The simplicity of this line — welcoming someone into
                  an imperfect home. It reminds me of my grandparents'
                  farmhouse in Vermont, screen doors and all."
                </p>
              </div>
              {/* Arrow connector */}
              <div className="flex flex-col items-center py-3 text-charcoal/15">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
                <span className="text-[10px] mt-1" style={{ fontFamily: dmSans }}>becomes</span>
              </div>
            </div>

            {/* Real AI-generated share card */}
            <div className="max-w-xs mx-auto relative overflow-hidden" style={{ borderRadius: '2px' }}>
              <div
                className="aspect-square flex flex-col justify-between p-8"
                style={{
                  backgroundImage: 'url(https://btrwdmeguitbbvcreokk.supabase.co/storage/v1/object/public/card-art/8BCAFAC3-B616-4F5D-A74E-CC3FA250CAF5/0e5e9671-6587-4d6a-baea-3264e491cb9f.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                }}
              >
                {/* Text overlay gradient */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)',
                  }}
                />
                <div className="relative z-10 flex flex-col justify-center flex-1">
                  <blockquote
                    className="text-white/90 leading-relaxed mb-4"
                    style={{ fontFamily: caveat, fontSize: '1.35rem', fontWeight: 500, lineHeight: 1.45 }}
                  >
                    Welcome this is a farmhouse
                    <br />We have cluster flies alas
                  </blockquote>
                  <div className="w-8 mb-2" style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 flex-shrink-0 rounded-sm"
                      style={{
                        backgroundImage: 'url(https://images.genius.com/a51fa1264a01a7e02914f5762e849251.300x301x1.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <p className="text-white/50 text-xs" style={{ fontFamily: dmSans, fontStyle: 'italic' }}>
                      Farmhouse — Phish
                    </p>
                  </div>
                </div>
                <p className="relative z-10 text-white/30 text-[10px]" style={{ fontFamily: dmSans, fontWeight: 600 }}>
                  earwyrm
                </p>
              </div>
              {/* Subtle border */}
              <div className="absolute inset-0 pointer-events-none" style={{ border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '2px' }} />
            </div>
            <p className="text-center text-xs text-charcoal/25 mt-4" style={{ fontFamily: dmSans }}>
              Share to your story, messages, or anywhere.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ── Section: Follow & Discover ── */}
      <section className="py-20 sm:py-28 px-6" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)' }}>
        <div className="max-w-2xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl text-charcoal mb-4" style={{ fontFamily: caveat, fontWeight: 600, lineHeight: 1.2 }}>
              Follow the music you love.<br />See what others hear in it.
            </h2>
            <p className="text-charcoal/40 max-w-md mx-auto leading-relaxed" style={{ fontFamily: dmSans }}>
              Follow your favorite artists and songs to see every lyric
              people are saving — and the personal stories behind them.
              Discover new music through someone else's moment.
            </p>
          </RevealSection>

          <RevealSection delay={100}>
            {/* Mock discussion thread */}
            <div className="max-w-sm mx-auto space-y-3 mb-14">
              <div className="p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-charcoal/35" style={{ fontFamily: dmSans }}>@jessicapark</span>
                  <span className="text-[10px] text-charcoal/20" style={{ fontFamily: dmSans }}>2h</span>
                </div>
                <p className="text-sm text-charcoal/55 leading-relaxed" style={{ fontFamily: dmSans }}>
                  I've listened to this song a hundred times but never caught this line until last week.
                  It completely changed how I hear the whole album.
                </p>
              </div>
              <div className="p-5 ml-6" style={cardStyle}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-charcoal/35" style={{ fontFamily: dmSans }}>@tomwinters</span>
                  <span className="text-[10px] text-charcoal/20" style={{ fontFamily: dmSans }}>1h</span>
                </div>
                <p className="text-sm text-charcoal/55 leading-relaxed" style={{ fontFamily: dmSans }}>
                  Same — it's one of those lyrics that means something different
                  every time you come back to it.
                </p>
              </div>
            </div>
          </RevealSection>

          <RevealSection delay={200}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-lg sm:max-w-none mx-auto">
              {[
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  ),
                  title: 'Discuss',
                  desc: 'Share your interpretation. Read theirs. Every lyric has a conversation waiting.',
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                      {[{ x: 4, h: 8 }, { x: 8, h: 14 }, { x: 12, h: 18 }, { x: 16, h: 14 }, { x: 20, h: 8 }].map((bar, i) => (
                        <line key={i} x1={bar.x} y1={12 - bar.h / 2} x2={bar.x} y2={12 + bar.h / 2} stroke="currentColor" strokeWidth="2.5" />
                      ))}
                    </svg>
                  ),
                  title: 'Resonate',
                  desc: 'When a lyric hits, let it be known. See what\'s moving people right now.',
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  ),
                  title: 'Collect',
                  desc: 'Save lyrics by mood, memory, or meaning. Your musical diary grows over time.',
                },
              ].map((item, i) => (
                <RevealSection key={i} delay={250 + i * 120} className="text-center">
                  <div
                    className="w-11 h-11 mx-auto mb-4 flex items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--surface-bg, #FAF8F5)', color: 'var(--color-accent, #B8A99A)' }}
                  >
                    {item.icon}
                  </div>
                  <h3 className="text-sm font-medium text-charcoal mb-1.5 lowercase" style={{ fontFamily: dmSans }}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-charcoal/35 leading-relaxed" style={{ fontFamily: dmSans }}>
                    {item.desc}
                  </p>
                </RevealSection>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── Section: Plus ── */}
      <section className="py-20 sm:py-28 px-6" style={{ backgroundColor: 'var(--surface-bg, #FAF8F5)' }}>
        <RevealSection className="max-w-md mx-auto text-center">
          <h2
            className="text-3xl sm:text-4xl mb-2"
            style={{
              fontFamily: caveat,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #C8B8A8 0%, #A08878 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            earwyrm+
          </h2>
          <p className="text-charcoal/35 text-sm mb-10" style={{ fontFamily: dmSans }}>
            For the ones who want more.
          </p>

          <div className="space-y-5 text-left mb-10">
            {[
              { label: 'AI-generated lyric art', desc: 'Personalized artwork for every lyric, painted from your words and feelings' },
              { label: 'Unlimited collections', desc: 'Organize by mood, memory, season, or anything you want' },
              { label: 'Plus badge', desc: 'A small mark of support, visible on your profile and share cards' },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full mt-0.5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(200,184,168,0.2) 0%, rgba(160,136,120,0.15) 100%)',
                    color: 'var(--color-accent, #B8A99A)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal" style={{ fontFamily: dmSans }}>{feature.label}</p>
                  <p className="text-sm text-charcoal/35 leading-relaxed" style={{ fontFamily: dmSans }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-charcoal/30 text-xs mb-8" style={{ fontFamily: dmSans }}>
            Starting at $2.99/month
          </p>
        </RevealSection>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 sm:py-28 px-6 text-center" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)' }}>
        <RevealSection>
          <h2
            className="text-3xl sm:text-4xl text-charcoal mb-3"
            style={{ fontFamily: caveat, fontWeight: 600, lineHeight: 1.2 }}
          >
            What's stuck in your head?
          </h2>
          <p className="text-charcoal/35 max-w-xs mx-auto leading-relaxed mb-10" style={{ fontFamily: dmSans }}>
            Start your lyric journal today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            {(platform === 'ios' || platform === 'desktop') && <StoreBadge platform="ios" size="small" />}
            {(platform === 'android' || platform === 'desktop') && <StoreBadge platform="android" size="small" />}
          </div>

          {!isMobile && (
            <Link to="/explore" className="text-sm text-charcoal/30 hover:text-charcoal/55 transition-colors" style={{ fontFamily: dmSans }}>
              or explore on the web
            </Link>
          )}
        </RevealSection>
      </section>

      {/* ── Footer ── */}
      <footer className="px-4 py-8 border-t border-charcoal/6">
        <div className="flex items-center justify-center gap-5 text-xs text-charcoal/25" style={{ fontFamily: dmSans }}>
          <Link to="/privacy" className="py-2 hover:text-charcoal/50 transition-colors">Privacy</Link>
          <span style={{ opacity: 0.4 }}>·</span>
          <Link to="/terms" className="py-2 hover:text-charcoal/50 transition-colors">Terms</Link>
          <span style={{ opacity: 0.4 }}>·</span>
          <a href="/dmca.html" className="py-2 hover:text-charcoal/50 transition-colors">DMCA</a>
        </div>
      </footer>
    </div>
  )
}
