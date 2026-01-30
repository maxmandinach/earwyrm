import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isValidUsername } from '../lib/utils'
import { supabase } from '../lib/supabase-wrapper'
import { signatureStyle } from '../lib/themes'
import SuggestMatches from '../components/SuggestMatches'

const CYCLE_INTERVAL = 6000
const FADE_DURATION = 600

// 'browse' → rotating cards + CTAs
// 'compose' → editable compose card
// 'signup' → full-size read-only lyric card + signup form below
const STEPS = { browse: 'browse', compose: 'compose', signup: 'signup' }

export default function Landing() {
  const [lyrics, setLyrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const [step, setStep] = useState(STEPS.browse)
  const [draftContent, setDraftContent] = useState('')
  const [draftSongTitle, setDraftSongTitle] = useState('')
  const [draftArtistName, setDraftArtistName] = useState('')
  const [draftCanonicalLyricId, setDraftCanonicalLyricId] = useState(null)
  const [draftLocked, setDraftLocked] = useState(false)
  const [draftPreMatchContent, setDraftPreMatchContent] = useState('')

  const handleDraftMatchSelect = (match) => {
    if (match) {
      setDraftPreMatchContent(draftContent)
      setDraftContent(match.content)
      if (match.artistName) setDraftArtistName(match.artistName)
      if (match.songTitle) setDraftSongTitle(match.songTitle)
      setDraftCanonicalLyricId(match.id)
      setDraftLocked(true)
    } else if (draftLocked) {
      setDraftContent(draftPreMatchContent)
      setDraftArtistName('')
      setDraftCanonicalLyricId(null)
      setDraftLocked(false)
    } else {
      setDraftCanonicalLyricId(null)
    }
  }

  const handleDraftClearLock = () => {
    setDraftContent('')
    setDraftSongTitle('')
    setDraftArtistName('')
    setDraftCanonicalLyricId(null)
    setDraftLocked(false)
  }

  // Signup form state
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchFeaturedLyrics() {
      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select(`
            *,
            profiles:user_id(username),
            lyric_notes(content, note_types)
          `)
          .eq('is_public', true)
          .order('reaction_count', { ascending: false })
          .limit(8)

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
      const timer = setTimeout(() => setRevealed(true), 200)
      return () => clearTimeout(timer)
    }
  }, [loading])

  // Auto-cycle through lyrics
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

  const theme = signatureStyle
  const activeLyric = lyrics[activeIndex]

  const handleComposeNext = (e) => {
    e.preventDefault()
    if (!draftContent.trim()) return
    localStorage.setItem('earwyrm_draft_lyric', JSON.stringify({
      content: draftContent.trim(),
      songTitle: draftSongTitle.trim(),
      artistName: draftArtistName.trim(),
      canonicalLyricId: draftCanonicalLyricId,
    }))
    setStep(STEPS.signup)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setSignupError('')

    if (!isValidUsername(username)) {
      setSignupError('Username must be 3-20 characters, letters, numbers, and underscores only')
      return
    }
    if (password.length < 6) {
      setSignupError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setSignupError('Passwords do not match')
      return
    }

    setSignupLoading(true)
    try {
      const { data } = await signUp(email, password, username)
      if (data?.user && !data?.session) {
        setSignupError('Please check your email to confirm your account before logging in.')
      } else {
        navigate('/home?saveDraft=true')
      }
    } catch (err) {
      if (err.message?.includes('duplicate key')) {
        setSignupError('Username is already taken')
      } else {
        setSignupError(err.message || 'Failed to create account')
      }
    } finally {
      setSignupLoading(false)
    }
  }

  // Shared card style
  const cardStyle = {
    backgroundColor: 'var(--surface-card, #F5F2ED)',
    color: 'var(--text-primary, #2C2825)',
    boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08))',
    border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex justify-between items-center">
        <Link
          to="/"
          className="hover:opacity-70 transition-opacity"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary, #2C2825)' }}
        >
          earwyrm
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/explore"
            className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Explore
          </Link>
          <Link
            to="/login"
            className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">

        {/* Step: signup — full-size lyric card + signup form */}
        {step === STEPS.signup && (
          <div className="w-full max-w-md">
            {/* Full-size read-only lyric card */}
            <div className="p-6 sm:p-8 mb-8" style={cardStyle}>
              <blockquote
                className="leading-relaxed"
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                  fontWeight: theme.fontWeight,
                  lineHeight: 1.5,
                }}
              >
                {draftContent}
              </blockquote>

              {(draftSongTitle || draftArtistName) && (
                <>
                  <div
                    className="w-16 mt-4 mb-3"
                    style={{
                      height: '1.5px',
                      backgroundColor: 'var(--color-accent, #B8A99A)',
                      opacity: 0.5,
                    }}
                  />
                  <p
                    className="text-sm"
                    style={{
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      fontStyle: 'italic',
                      color: 'var(--text-secondary, #6B635A)',
                    }}
                  >
                    {draftSongTitle}
                    {draftSongTitle && draftArtistName && ' — '}
                    {draftArtistName}
                  </p>
                </>
              )}
            </div>

            {/* Signup form */}
            <h2 className="text-xl font-light text-charcoal mb-6 lowercase text-center">
              create an account to save your lyric
            </h2>

            <form onSubmit={handleSignup}>
              {signupError && (
                <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200">
                  {signupError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <div className="flex items-center border border-charcoal/20 focus-within:border-charcoal/40">
                    <span className="pl-4 text-charcoal-light">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="username"
                      required
                      className="flex-1 px-2 py-3 bg-transparent focus:outline-none
                                 placeholder:text-charcoal-light/50 text-charcoal"
                    />
                  </div>
                  <p className="mt-1 text-xs text-charcoal-light">
                    This will be your public URL: earwyrm.app/@{username || 'username'}
                    <br />
                    Your profile and lyric are private by default.
                  </p>
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  required
                  className="w-full px-4 py-3 bg-transparent border border-charcoal/20
                             focus:border-charcoal/40 focus:outline-none
                             placeholder:text-charcoal-light/50 text-charcoal"
                />

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="password"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-20 bg-transparent border border-charcoal/20
                                 focus:border-charcoal/40 focus:outline-none
                                 placeholder:text-charcoal-light/50 text-charcoal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-light hover:text-charcoal"
                    >
                      {showPassword ? 'hide' : 'show'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-charcoal-light">
                    At least 6 characters
                  </p>
                </div>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="confirm password"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-20 bg-transparent border border-charcoal/20
                               focus:border-charcoal/40 focus:outline-none
                               placeholder:text-charcoal-light/50 text-charcoal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-light hover:text-charcoal"
                  >
                    {showConfirmPassword ? 'hide' : 'show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={signupLoading}
                className="mt-6 w-full py-3 text-sm font-medium transition-all hover:opacity-90
                           disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--text-primary, #2C2825)',
                  color: 'var(--surface-bg, #FAF8F5)',
                }}
              >
                {signupLoading ? 'creating account...' : 'create account & save'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                onClick={() => setStep(STEPS.compose)}
                className="text-charcoal/50 hover:text-charcoal transition-colors"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                &larr; Edit lyric
              </button>
              <p className="text-charcoal-light">
                already have an account?{' '}
                <Link to="/login" className="text-charcoal underline hover:no-underline">
                  sign in
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Step: compose — editable card */}
        {step === STEPS.compose && (
          <>
            {/* Tagline */}
            <div
              className="text-center mb-8"
              style={{ opacity: 1 }}
            >
              <p
                className="text-lg sm:text-xl text-charcoal/50 max-w-sm mx-auto leading-relaxed"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Save the lines that stay with you.
                <br />
                See what resonates with others.
              </p>
            </div>

            <div className="w-full max-w-md mb-8">
              <form onSubmit={handleComposeNext}>
                <div className="p-6 sm:p-8" style={cardStyle}>
                  <div className="relative">
                    <textarea
                      value={draftContent}
                      onChange={(e) => { if (!draftLocked) setDraftContent(e.target.value) }}
                      readOnly={draftLocked}
                      placeholder="What lyric is stuck in your head?"
                      autoFocus={!draftLocked}
                      rows={3}
                      className={`w-full bg-transparent resize-none leading-relaxed placeholder:text-charcoal/30 focus:outline-none ${draftLocked ? 'opacity-70' : ''}`}
                      style={{
                        fontFamily: theme.fontFamily,
                        fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                        fontWeight: theme.fontWeight,
                        lineHeight: 1.5,
                      }}
                    />
                    {draftLocked && (
                      <button
                        type="button"
                        onClick={handleDraftClearLock}
                        className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal/10 hover:bg-charcoal/20 text-charcoal/60 hover:text-charcoal transition-colors"
                        aria-label="Clear matched lyric"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div
                    className="w-16 mt-4 mb-3"
                    style={{
                      height: '1.5px',
                      backgroundColor: 'var(--color-accent, #B8A99A)',
                      opacity: 0.5,
                    }}
                  />

                  {/* Suggest matches — searches as user types lyric or song title */}
                  {!draftLocked && (
                    <SuggestMatches content={draftContent} songTitle={draftSongTitle} onSelect={handleDraftMatchSelect} />
                  )}

                  <div className="space-y-2" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    <input
                      type="text"
                      value={draftSongTitle}
                      onChange={(e) => setDraftSongTitle(e.target.value)}
                      placeholder="Song title (optional)"
                      className="w-full bg-transparent text-sm placeholder:text-charcoal/30 focus:outline-none"
                      style={{
                        fontStyle: 'italic',
                        color: 'var(--text-secondary, #6B635A)',
                      }}
                    />
                    <input
                      type="text"
                      value={draftArtistName}
                      onChange={(e) => setDraftArtistName(e.target.value)}
                      placeholder="Artist (optional)"
                      className="w-full bg-transparent text-sm placeholder:text-charcoal/30 focus:outline-none"
                      style={{
                        fontStyle: 'italic',
                        color: 'var(--text-secondary, #6B635A)',
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(STEPS.browse)}
                    className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    disabled={!draftContent.trim()}
                    className="px-8 py-3 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--text-primary, #2C2825)',
                      color: 'var(--surface-bg, #FAF8F5)',
                    }}
                  >
                    Sign up &amp; save
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Step: browse — rotating cards + CTAs */}
        {step === STEPS.browse && (
          <>
            {/* Tagline */}
            <div
              className="text-center mb-8 transition-all duration-700 ease-out"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(12px)',
              }}
            >
              <p
                className="text-lg sm:text-xl text-charcoal/50 max-w-sm mx-auto leading-relaxed"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Save the lines that stay with you.
                <br />
                See what resonates with others.
              </p>
            </div>

            {/* Rotating lyric card */}
            {!loading && activeLyric && (
              <div
                className="w-full max-w-md mb-8 transition-all duration-700 ease-out"
                style={{
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? 'translateY(0)' : 'translateY(16px)',
                  transitionDelay: '200ms',
                }}
              >
                <div
                  className="relative"
                  style={{ minHeight: '200px' }}
                >
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
                        fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                        fontWeight: theme.fontWeight,
                        lineHeight: 1.5,
                      }}
                    >
                      {activeLyric.content}
                    </blockquote>

                    {(activeLyric.song_title || activeLyric.artist_name) && (
                      <>
                        <div
                          className="w-16 mt-4 mb-3"
                          style={{
                            height: '1.5px',
                            backgroundColor: 'var(--color-accent, #B8A99A)',
                            opacity: 0.5,
                          }}
                        />
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
                      </>
                    )}

                    {activeLyric.lyric_notes?.[0] && (
                      <div
                        className="mt-4 pt-3 border-t border-charcoal/8"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                      >
                        <p className="text-sm leading-relaxed text-charcoal/55 line-clamp-2">
                          {activeLyric.lyric_notes[0].content}
                        </p>
                      </div>
                    )}

                    <p
                      className="mt-3 text-xs text-charcoal/30"
                      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                    >
                      shared by @{activeLyric.profiles?.username || 'anonymous'}
                    </p>
                  </div>
                </div>

                {lyrics.length > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {lyrics.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (i === activeIndex) return
                          setFading(true)
                          setTimeout(() => {
                            setActiveIndex(i)
                            setFading(false)
                          }, FADE_DURATION)
                        }}
                        className="transition-all duration-300"
                        style={{
                          width: i === activeIndex ? '20px' : '6px',
                          height: '6px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--text-primary, #2C2825)',
                          opacity: i === activeIndex ? 0.5 : 0.15,
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
              className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 transition-all duration-700 ease-out"
              style={{
                opacity: revealed ? 1 : 0,
                transitionDelay: '400ms',
              }}
            >
              <Link
                to="/explore"
                className="px-8 py-3.5 text-sm font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: 'var(--text-primary, #2C2825)',
                  color: 'var(--surface-bg, #FAF8F5)',
                }}
              >
                See what's resonating
              </Link>
              <button
                onClick={() => setStep(STEPS.compose)}
                className="px-8 py-3.5 text-sm font-medium border transition-colors hover:border-charcoal/40 hover:text-charcoal"
                style={{
                  borderColor: 'var(--text-primary, #2C2825)',
                  color: 'var(--text-primary, #2C2825)',
                  opacity: 0.7,
                }}
              >
                Share your first lyric
              </button>
            </div>
          </>
        )}
      </div>

      {/* Feature tour — below the fold, hidden during compose/signup */}
      {step === STEPS.browse && <div
        className="border-t border-charcoal/8 py-16 px-4"
        style={{ backgroundColor: 'var(--surface-bg, #FAF8F5)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl text-charcoal text-center mb-12"
            style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
          >
            How it works
          </h2>

          <div className="space-y-10 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div
                className="text-3xl mb-3 mx-auto w-12 h-12 flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'var(--surface-card, #F5F2ED)',
                  fontFamily: "'Caveat', cursive",
                  color: 'var(--text-primary, #2C2825)',
                }}
              >
                1
              </div>
              <h3
                className="text-base font-medium text-charcoal mb-2"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Save a lyric
              </h3>
              <p
                className="text-sm text-charcoal/50 leading-relaxed max-w-[200px] mx-auto"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Post the line stuck in your head. Add a note about why it matters to you.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div
                className="text-3xl mb-3 mx-auto w-12 h-12 flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'var(--surface-card, #F5F2ED)',
                  fontFamily: "'Caveat', cursive",
                  color: 'var(--text-primary, #2C2825)',
                }}
              >
                2
              </div>
              <h3
                className="text-base font-medium text-charcoal mb-2"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                See others' takes
              </h3>
              <p
                className="text-sm text-charcoal/50 leading-relaxed max-w-[200px] mx-auto"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Browse what resonates. Read interpretations, backstories, and personal connections.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div
                className="text-3xl mb-3 mx-auto w-12 h-12 flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'var(--surface-card, #F5F2ED)',
                  fontFamily: "'Caveat', cursive",
                  color: 'var(--text-primary, #2C2825)',
                }}
              >
                3
              </div>
              <h3
                className="text-base font-medium text-charcoal mb-2"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Build your collection
              </h3>
              <p
                className="text-sm text-charcoal/50 leading-relaxed max-w-[200px] mx-auto"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Your collection grows over time. Follow artists and tags. Share what moves you.
              </p>
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="text-center mt-12">
            <button
              onClick={() => {
                setShowCompose(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="inline-block px-8 py-3 text-sm font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: 'var(--text-primary, #2C2825)',
                color: 'var(--surface-bg, #FAF8F5)',
              }}
            >
              Share your first lyric
            </button>
          </div>
        </div>
      </div>}

      {/* Footer */}
      <footer className="px-4 py-6 border-t border-charcoal/10">
        <div className="flex items-center justify-center gap-4 text-sm sm:text-xs text-charcoal-light/60">
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
