import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import { useFollow } from '../contexts/FollowContext'
import LyricCard from '../components/LyricCard'
import LyricForm from '../components/LyricForm'
import ReplaceModal from '../components/ReplaceModal'
import ShareModal from '../components/ShareModal'
import IdentifySongModal from '../components/IdentifySongModal'
import OnboardingFlow from '../components/OnboardingFlow'
import { getRandomPrompt } from '../lib/utils'
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

  // Home view — always show feed sections, with or without a current lyric
  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 space-y-10">
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

      {showIdentifyModal && (
        <IdentifySongModal
          onClose={() => setShowIdentifyModal(false)}
          onSaveAsEarwyrm={handleSaveAsEarwyrm}
        />
      )}
    </div>
  )
}
