import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import LyricCard from '../components/LyricCard'
import LyricForm from '../components/LyricForm'
import ReplaceModal from '../components/ReplaceModal'
import ShareModal from '../components/ShareModal'
import VisibilityToggle from '../components/VisibilityToggle'
import NoteEditor from '../components/NoteEditor'
import OnboardingFlow from '../components/OnboardingFlow'
import ActivityFeed from '../components/ActivityFeed'
import TrendingSection from '../components/TrendingSection'
import FollowFeed from '../components/FollowFeed'
import { getRandomPrompt } from '../lib/utils'
import { supabase } from '../lib/supabase-wrapper'

function CompactPostPrompt() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="w-full max-w-lg mx-auto mb-8 flex items-center gap-3">
      <input
        type="text"
        placeholder="What lyric is stuck in your head?"
        className="flex-1 px-4 py-3 text-sm bg-transparent border border-charcoal/10 text-charcoal focus:outline-none focus:border-charcoal/30 placeholder:text-charcoal/30"
        style={{ fontFamily: "'Caveat', cursive", fontSize: '1.125rem' }}
        onFocus={() => {
          // Navigate to full form - for now just expand
        }}
        readOnly
      />
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
        className="mt-12 text-xs text-charcoal-light/60 text-center max-w-sm transition-all duration-500 ease-out"
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

function LyricView({ lyric, onUpdate, onReplace, onVisibilityChange, revealed }) {
  const { profile, user } = useAuth()
  const { fetchNoteForLyric, saveNote } = useLyric()
  const [isEditingCard, setIsEditingCard] = useState(false)
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [allUserTags, setAllUserTags] = useState([])
  const [currentNote, setCurrentNote] = useState(null)

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

  const handleUpdate = async (data) => {
    await onUpdate(data)
  }

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

  const [isEditingNote, setIsEditingNote] = useState(false)

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
          transform: revealed ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
        }}
      >
        <LyricCard
          lyric={lyric}
          isEditing={isEditingCard}
          onSave={handleCardSave}
          onCancel={() => setIsEditingCard(false)}
          linkable={!isEditingCard}
        />

        {!isEditingNote && !isEditingCard && (
          <div
            className="absolute bottom-4 right-4 flex gap-2 transition-opacity duration-500"
            style={{
              opacity: revealed ? 1 : 0,
              transitionDelay: '400ms',
            }}
          >
            <button
              onClick={() => setIsEditingCard(true)}
              className="p-3 text-charcoal-light/50 hover:text-charcoal transition-colors"
              title="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
            <button
              onClick={() => setShowReplaceModal(true)}
              className="p-3 text-charcoal-light/50 hover:text-charcoal transition-colors"
              title="New lyric"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Note */}
      <div
        className="w-full max-w-lg mx-auto mt-8 transition-all duration-700 ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(16px)',
          transitionDelay: '400ms',
        }}
      >
        <NoteEditor
          lyricId={lyric.id}
          initialNote={currentNote}
          onEditStateChange={setIsEditingNote}
          onNoteChange={setCurrentNote}
        />
      </div>

      {/* Actions */}
      <div
        className="mt-8 flex items-center justify-center gap-6 text-sm transition-all duration-600 ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(10px)',
          transitionDelay: '600ms',
        }}
      >
        <VisibilityToggle
          isPublic={lyric.is_public}
          profileIsPublic={profile?.is_public}
          onChange={handleVisibilityChange}
        />
        <button
          onClick={() => setShowShareModal(true)}
          className="py-2 px-3 text-charcoal-light hover:text-charcoal transition-colors"
        >
          share
        </button>
      </div>

      {showReplaceModal && (
        <ReplaceModal
          onReplace={onReplace}
          onClose={() => setShowReplaceModal(false)}
          allUserTags={allUserTags}
        />
      )}

      {showShareModal && (
        <ShareModal
          lyric={lyric}
          note={currentNote}
          username={profile?.username}
          isPublic={lyric.is_public}
          onVisibilityChange={handleVisibilityChange}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  )
}

export default function Home() {
  const { profile } = useAuth()
  const { currentLyric, loading, setLyric, replaceLyric, setVisibility } = useLyric()
  const [revealed, setRevealed] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

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

  // Check if user needs onboarding (skip if draft was just saved)
  useEffect(() => {
    if (!loading && profile && !profile.onboarded_at && !draftSaved) {
      setShowOnboarding(true)
    }
  }, [loading, profile?.onboarded_at, draftSaved])

  const handleUpdate = async (data) => {
    await replaceLyric({
      content: data.content,
      songTitle: data.songTitle,
      artistName: data.artistName,
      tags: data.tags,
    })
  }

  const handleReplace = async (data) => {
    await setLyric({
      content: data.content,
      songTitle: data.songTitle,
      artistName: data.artistName,
      tags: data.tags,
      canonicalLyricId: data.canonicalLyricId || null,
    })
  }

  if (loading) {
    return <div className="flex-1" />
  }

  // Onboarding flow for first-time users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
  }

  // No current lyric
  if (!currentLyric) {
    return <EmptyState onSetLyric={setLyric} revealed={revealed} />
  }

  // Poster view with social sections
  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 space-y-10">
      <LyricView
        lyric={currentLyric}
        onUpdate={handleUpdate}
        onReplace={handleReplace}
        onVisibilityChange={setVisibility}
        revealed={revealed}
      />

      {/* Social sections - fade in after hero */}
      <div
        className="w-full space-y-10 transition-all duration-700 ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transitionDelay: '800ms',
        }}
      >
        <ActivityFeed />
        <FollowFeed />
        <TrendingSection />
      </div>
    </div>
  )
}
