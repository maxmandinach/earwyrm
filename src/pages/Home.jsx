import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import LyricCard from '../components/LyricCard'
import LyricForm from '../components/LyricForm'
import ReplaceModal from '../components/ReplaceModal'
import ShareModal from '../components/ShareModal'
import VisibilityToggle from '../components/VisibilityToggle'
import NoteEditor from '../components/NoteEditor'
import { getRandomPrompt } from '../lib/utils'
import { supabase } from '../lib/supabase-wrapper'

function EmptyState({ onSetLyric }) {
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
      <p className="text-lg text-charcoal mb-8 text-center max-w-md">
        {prompt}
      </p>

      <LyricForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />

      <p className="mt-12 text-xs text-charcoal-light/60 text-center max-w-sm">
        Lyrics are private by default. You decide when (and if) others can see what's here.
      </p>
    </div>
  )
}

function LyricView({ lyric, onUpdate, onReplace, onVisibilityChange }) {
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

        // Extract all tags and get unique values
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
      // Also update note visibility if there's a note
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
    // Preserve existing tags when doing inline edit
    await onUpdate({ ...data, tags: lyric.tags || [] })
    setIsEditingCard(false)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      {/* Lyric card with inline editing */}
      <div className="relative w-full max-w-lg">
        <LyricCard
          lyric={lyric}
          isEditing={isEditingCard}
          onSave={handleCardSave}
          onCancel={() => setIsEditingCard(false)}
          linkable={!isEditingCard}
        />

        {/* Edit & New buttons - hidden when editing */}
        {!isEditingNote && !isEditingCard && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            {/* Edit (pencil) - inline editing */}
            <button
              onClick={() => setIsEditingCard(true)}
              className="p-2 text-charcoal-light/50 hover:text-charcoal transition-colors"
              title="Edit"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>

            {/* New lyric (plus) */}
            <button
              onClick={() => setShowReplaceModal(true)}
              className="p-2 text-charcoal-light/50 hover:text-charcoal transition-colors"
              title="New lyric"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Note - separated zone with clear clickable area */}
      <div className="w-full max-w-lg mt-8">
        <NoteEditor
          lyricId={lyric.id}
          initialNote={currentNote}
          onEditStateChange={setIsEditingNote}
        />
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-6 text-sm">
        <VisibilityToggle
          isPublic={lyric.is_public}
          onChange={handleVisibilityChange}
        />

        <button
          onClick={() => setShowShareModal(true)}
          className="text-charcoal-light hover:text-charcoal transition-colors"
        >
          Share
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
    </div>
  )
}

export default function Home() {
  const { currentLyric, loading, setLyric, replaceLyric, setVisibility } = useLyric()

  // Edit in place - keeps note attached
  const handleUpdate = async (data) => {
    await replaceLyric({
      content: data.content,
      songTitle: data.songTitle,
      artistName: data.artistName,
      tags: data.tags,
    })
  }

  // Create new lyric - archives current one to Memory Lane
  const handleReplace = async (data) => {
    await setLyric({
      content: data.content,
      songTitle: data.songTitle,
      artistName: data.artistName,
      tags: data.tags,
    })
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-charcoal-light text-sm">Loading...</div>
      </div>
    )
  }

  if (!currentLyric) {
    return <EmptyState onSetLyric={setLyric} />
  }

  return (
    <LyricView
      lyric={currentLyric}
      onUpdate={handleUpdate}
      onReplace={handleReplace}
      onVisibilityChange={setVisibility}
    />
  )
}
