import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import { useFollow } from '../contexts/FollowContext'
import LyricCard from '../components/LyricCard'
import LyricForm from '../components/LyricForm'
import ReplaceModal from '../components/ReplaceModal'
import ShareModal from '../components/ShareModal'
import IdentifySongModal from '../components/IdentifySongModal'
import OnboardingFlow from '../components/OnboardingFlow'
import { getRandomPrompt, formatRelativeTime } from '../lib/utils'
import { signatureStyle } from '../lib/themes'
import { supabase } from '../lib/supabase-wrapper'

function CompactPostPrompt() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="w-full max-w-lg mx-auto mb-8 flex items-center gap-3">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30 pointer-events-none"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="What lyric is stuck in your head?"
          className="w-full rounded-full bg-charcoal/5 border border-charcoal/8
                     pl-9 pr-9 py-2.5 text-sm text-charcoal
                     focus:outline-none focus:border-charcoal/20
                     placeholder:text-charcoal/30"
          readOnly
        />
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-charcoal/20 hover:text-charcoal/40 text-sm"
      >
        ✕
      </button>
    </div>
  )
}

function EmptyState({ onSetLyric, revealed }) {
  const [prompt] = useState(() => getRandomPrompt())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (data) => {
    setIsLoading(true)
    setError(null)
    try {
      await onSetLyric(data)
    } catch (err) {
      console.error('Error setting lyric:', err)
      setError(err.message || 'Failed to save lyric. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <p
        className="text-lg text-charcoal mb-8 text-center max-w-md transition-all duration-700 ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        {prompt}
      </p>

      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: '200ms',
        }}
      >
        <LyricForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
      </div>

      <p
        className="mt-12 text-xs text-charcoal/30 text-center max-w-sm transition-all duration-500 ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transitionDelay: '600ms',
        }}
      >
        Lyrics are private by default. You decide when (and if) others can see what's here.
      </p>
    </div>
  )
}

function LyricView({ lyric, onUpdate, onReplace, onVisibilityChange, revealed, prefill, clearPrefill }) {
  const { profile, user } = useAuth()
  const { fetchNoteForLyric, saveNote } = useLyric()
  const [isEditingCard, setIsEditingCard] = useState(false)
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [allUserTags, setAllUserTags] = useState([])
  const [currentNote, setCurrentNote] = useState(null)

  // Open ReplaceModal pre-filled when prefill data arrives
  useEffect(() => {
    if (prefill) {
      setShowReplaceModal(true)
    }
  }, [prefill])

  // Fetch note for current lyric
  useEffect(() => {
    async function fetchNote() {
      if (!lyric?.id) return
      try {
        const note = await fetchNoteForLyric(lyric.id)
        setCurrentNote(note)
      } catch (err) {
        console.error('Error fetching note:', err)
      }
    }
    fetchNote()
  }, [lyric?.id, fetchNoteForLyric])

  // Fetch all unique tags from user's lyrics for autocomplete
  useEffect(() => {
    async function fetchUserTags() {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select('tags')
          .eq('user_id', user.id)

        if (error) throw error

        const allTags = data
          .flatMap(lyric => lyric.tags || [])
          .filter((tag, index, self) => self.indexOf(tag) === index)

        setAllUserTags(allTags)
      } catch (err) {
        console.error('Error fetching user tags:', err)
      }
    }
    fetchUserTags()
  }, [user?.id])

  const handleVisibilityChange = async (isPublic) => {
    try {
      await onVisibilityChange(isPublic)
      if (currentNote?.content) {
        await saveNote(lyric.id, currentNote.content, isPublic)
        setCurrentNote(prev => prev ? { ...prev, is_public: isPublic } : null)
      }
    } catch (err) {
      console.error('Error changing visibility:', err)
    }
  }

  const handleCardSave = async (data) => {
    await onUpdate({ ...data, tags: lyric.tags || [] })
    setIsEditingCard(false)
  }

  return (
    <>
      {/* Your current lyric - hero position */}
      <div
        className="relative w-full max-w-lg mx-auto transition-all duration-1000 ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0) scale(1) rotate(0deg)' : 'translateY(20px) scale(0.98) rotate(-0.5deg)',
        }}
      >
        <LyricCard
          lyric={lyric}
          isEditing={isEditingCard}
          onSave={handleCardSave}
          onCancel={() => setIsEditingCard(false)}
          linkable={!isEditingCard}
          showActions
          isOwn
          skipReveal
          hero
          isPublic={lyric.is_public}
          profileIsPublic={profile?.is_public}
          onShare={() => setShowShareModal(true)}
          onVisibilityChange={handleVisibilityChange}
          onEdit={() => setIsEditingCard(true)}
          onReplace={() => setShowReplaceModal(true)}
          initialNote={currentNote}
          onNoteChange={setCurrentNote}
          username={profile?.username}
        />
      </div>

      {showReplaceModal && (
        <ReplaceModal
          onReplace={onReplace}
          onClose={() => { setShowReplaceModal(false); if (clearPrefill) clearPrefill() }}
          allUserTags={allUserTags}
          initialSongTitle={prefill?.songTitle || ''}
          initialArtistName={prefill?.artistName || ''}
          initialCoverArtUrl={prefill?.coverArtUrl || null}
        />
      )}

      {showShareModal && (
        <ShareModal
          lyric={lyric}
          note={currentNote}
          onClose={() => setShowShareModal(false)}
          onNoteCreated={setCurrentNote}
        />
      )}
    </>
  )
}

// ── Past Earwyrms Feed ──
function PastEarwyrms({ currentLyricId }) {
  const { user } = useAuth()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const theme = signatureStyle

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_saved', false)
          .order('created_at', { ascending: false })

        if (error) { setLyrics([]); return }
        const realLyrics = (data || []).filter(l => l.id !== currentLyricId)
        setLyrics(realLyrics)

        if (realLyrics.length > 0) {
          const { data: notesData } = await supabase
            .from('lyric_notes')
            .select('*')
            .eq('user_id', user.id)
          if (notesData) {
            const notesMap = {}
            notesData.forEach(note => { notesMap[note.lyric_id] = note })
            setNotes(notesMap)
          }
        }
      } catch {
        setLyrics([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [user, currentLyricId])

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-5" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)', border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
            <div className="skeleton h-5 w-full mb-2" />
            <div className="skeleton h-5 w-3/4 mb-2" />
            <div className="skeleton h-3 w-32 mt-4" />
          </div>
        ))}
      </div>
    )
  }

  if (lyrics.length === 0) return null

  return (
    <div className="w-full max-w-lg mx-auto">
      <p
        className="text-sm text-charcoal/30 mb-4"
        style={{ fontFamily: "'Caveat', cursive", fontSize: '1.1rem' }}
      >
        past earwyrms
      </p>
      <div className="space-y-4">
        {lyrics.map((lyric) => {
          const bgArt = lyric.card_art_url || lyric.cover_art_url
          const hasArt = !!bgArt
          return (
            <div
              key={lyric.id}
              className="relative overflow-hidden p-5"
              style={{
                backgroundColor: 'var(--surface-card, #F5F2ED)',
                boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08))',
                border: hasArt ? 'none' : '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
              }}
            >
              {/* Art background */}
              {hasArt && (
                <>
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${bgArt})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: lyric.card_art_url ? 0.7 : 0.12,
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: lyric.card_art_url
                        ? 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5))'
                        : 'none',
                    }}
                  />
                </>
              )}

              {/* Content */}
              <div className="relative">
                <blockquote
                  className="leading-relaxed mb-3 line-clamp-4"
                  style={{
                    fontFamily: theme.fontFamily,
                    fontSize: '1.3rem',
                    fontWeight: theme.fontWeight,
                    lineHeight: theme.lineHeight,
                    whiteSpace: 'pre-line',
                    ...(lyric.card_art_url ? { color: '#FAF8F5' } : {}),
                  }}
                >
                  {lyric.content}
                </blockquote>

                {(lyric.song_title || lyric.artist_name) && (
                  <>
                    <div className="w-10 mt-3 mb-2" style={{ height: '1.5px', backgroundColor: lyric.card_art_url ? 'rgba(255,255,255,0.3)' : 'var(--color-accent, #B8A99A)', opacity: lyric.card_art_url ? 1 : 0.4 }} />
                    <div className="flex items-center gap-2">
                      {lyric.cover_art_url && (
                        <div
                          className="w-8 h-8 flex-shrink-0 rounded"
                          style={{
                            backgroundImage: `url(${lyric.cover_art_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                          }}
                        />
                      )}
                      <p className="text-xs italic truncate" style={{ color: lyric.card_art_url ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary, #6B635A)' }}>
                        {lyric.song_title}
                        {lyric.song_title && lyric.artist_name && ' — '}
                        {lyric.artist_name}
                      </p>
                    </div>
                  </>
                )}

                {notes[lyric.id]?.content && (
                  <div className="mt-3 pl-3" style={{ borderLeft: `2px solid ${lyric.card_art_url ? 'rgba(255,255,255,0.3)' : 'var(--color-accent, #B8A99A)'}` }}>
                    <p className="text-xs italic line-clamp-2" style={{ color: lyric.card_art_url ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary, #6B635A)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      {notes[lyric.id].content}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-3 pt-2" style={{ borderTop: `1px solid ${lyric.card_art_url ? 'rgba(255,255,255,0.1)' : 'var(--border-subtle, rgba(0,0,0,0.06))'}` }}>
                  {(lyric.reaction_count || 0) > 0 && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: lyric.card_art_url ? 'rgba(255,255,255,0.4)' : 'var(--text-muted, #9C948A)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                        {[{ x: 4, h: 6 }, { x: 8, h: 10 }, { x: 12, h: 14 }, { x: 16, h: 10 }, { x: 20, h: 6 }].map((bar, i) => (
                          <line key={i} x1={bar.x} y1={12 - bar.h / 2} x2={bar.x} y2={12 + bar.h / 2} stroke="currentColor" strokeWidth="2" />
                        ))}
                      </svg>
                      {lyric.reaction_count}
                    </span>
                  )}
                  {(lyric.comment_count || 0) > 0 && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: lyric.card_art_url ? 'rgba(255,255,255,0.4)' : 'var(--text-muted, #9C948A)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      {lyric.comment_count}
                    </span>
                  )}
                  {lyric.created_at && (
                    <span className="text-xs" style={{ color: lyric.card_art_url ? 'rgba(255,255,255,0.4)' : 'var(--text-muted, #9C948A)', opacity: lyric.card_art_url ? 1 : 0.6 }}>
                      {formatRelativeTime(lyric.created_at)}
                    </span>
                  )}
                  {lyric.tags && lyric.tags.length > 0 && (
                    <div className="flex gap-1.5 ml-auto">
                      {lyric.tags.map((tag, i) => (
                        <Link key={i} to={`/explore/tag/${encodeURIComponent(tag)}`} className="text-xs transition-colors" style={{ color: lyric.card_art_url ? 'rgba(255,255,255,0.3)' : 'var(--text-muted, #9C948A)', opacity: lyric.card_art_url ? 1 : 0.5 }}>
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── App Download Nudge ──
function AppDownloadNudge() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('earwyrm-app-nudge-dismissed') === 'true'
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('earwyrm-app-nudge-dismissed', 'true')
  }

  return (
    <div
      className="w-full max-w-lg mx-auto p-4 flex items-center gap-4"
      style={{
        backgroundColor: 'var(--surface-card, #F5F2ED)',
        border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: 'var(--text-primary, #2C2825)' }}>
          earwyrm for iOS
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted, #9C948A)' }}>
          Generate AI art, identify songs, and more
        </p>
      </div>
      <a
        href="https://apps.apple.com/app/earwyrm/id000000000"
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
        style={{
          backgroundColor: 'var(--color-accent, #B8A99A)',
          color: 'white',
          borderRadius: '6px',
        }}
      >
        Get the app
      </a>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-charcoal/20 hover:text-charcoal/40 transition-colors text-sm leading-none"
      >
        ✕
      </button>
    </div>
  )
}

export default function Home() {
  const { profile } = useAuth()
  const { currentLyric, loading, setLyric, replaceLyric, setVisibility, saveNote } = useLyric()
  const { follows } = useFollow()
  const [revealed, setRevealed] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [showIdentifyModal, setShowIdentifyModal] = useState(false)
  const [replacePrefill, setReplacePrefill] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Listen for "save as earwyrm" from menu-opened identify modal
  useEffect(() => {
    const handler = (e) => {
      setReplacePrefill(e.detail)
    }
    window.addEventListener('earwyrm:identify-save', handler)
    return () => window.removeEventListener('earwyrm:identify-save', handler)
  }, [])

  // Consume draft lyric from localStorage after signup
  useEffect(() => {
    if (loading) return
    const params = new URLSearchParams(location.search)
    if (params.get('saveDraft') !== 'true') return
    const raw = localStorage.getItem('earwyrm_draft_lyric')
    if (!raw) return

    async function saveDraft() {
      try {
        const data = JSON.parse(raw)
        await setLyric({ content: data.content, songTitle: data.songTitle, artistName: data.artistName, canonicalLyricId: data.canonicalLyricId || null })
        localStorage.removeItem('earwyrm_draft_lyric')
        setDraftSaved(true)
      } catch (err) {
        console.error('Error saving draft lyric:', err)
      } finally {
        navigate('/home', { replace: true })
      }
    }
    saveDraft()
  }, [loading, location.search])

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setRevealed(true), 400)
      return () => clearTimeout(timer)
    }
  }, [loading])

  // Check if user needs onboarding
  // Skip if: already onboarded, draft was just saved, or user has follows (active iOS user)
  useEffect(() => {
    if (!loading && profile && !profile.onboarded_at && !draftSaved && follows.length === 0) {
      setShowOnboarding(true)
    }
  }, [loading, profile?.onboarded_at, draftSaved, follows.length])

  const handleUpdate = async (data) => {
    await replaceLyric({
      content: data.content,
      songTitle: data.songTitle,
      artistName: data.artistName,
      tags: data.tags,
    })
  }

  const handleReplace = async (data) => {
    const newLyric = await setLyric({
      content: data.content,
      songTitle: data.songTitle,
      artistName: data.artistName,
      tags: data.tags,
      canonicalLyricId: data.canonicalLyricId || null,
      coverArtUrl: data.coverArtUrl || null,
      musicbrainzRecordingId: data.musicbrainzRecordingId || null,
      musicbrainzReleaseId: data.musicbrainzReleaseId || null,
      album: data.album || null,
    })
    // Save note if one was provided
    if (data.note && newLyric?.id) {
      try {
        await saveNote(newLyric.id, data.note)
      } catch (err) {
        console.error('Error saving note:', err)
      }
    }
  }

  if (loading) {
    return <div className="flex-1" />
  }

  // Onboarding flow for first-time users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
  }

  const handleSaveAsEarwyrm = (prefillData) => {
    setShowIdentifyModal(false)
    setReplacePrefill(prefillData)
  }

  // Home view — hero card + past earwyrms feed
  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 space-y-8">
      {currentLyric ? (
        <LyricView
          lyric={currentLyric}
          onUpdate={handleUpdate}
          onReplace={handleReplace}
          onVisibilityChange={setVisibility}
          revealed={revealed}
          prefill={replacePrefill}
          clearPrefill={() => setReplacePrefill(null)}
        />
      ) : (
        <div
          className="w-full max-w-lg mx-auto transition-all duration-700 ease-out"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          <CompactPostPrompt />
          <EmptyState onSetLyric={setLyric} revealed={revealed} />
        </div>
      )}

      <AppDownloadNudge />

      <PastEarwyrms currentLyricId={currentLyric?.id} />

      {showIdentifyModal && (
        <IdentifySongModal
          onClose={() => setShowIdentifyModal(false)}
          onSaveAsEarwyrm={handleSaveAsEarwyrm}
        />
      )}
    </div>
  )
}
