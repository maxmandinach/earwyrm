import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import LyricCard from '../components/LyricCard'
import LyricForm from '../components/LyricForm'
import EditLyricModal from '../components/EditLyricModal'
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

function LyricView({ lyric, onUpdate, onVisibilityChange }) {
  const { profile, user } = useAuth()
  const { fetchNoteForLyric } = useLyric()
  const [showEditModal, setShowEditModal] = useState(false)
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
    } catch (err) {
      console.error('Error changing visibility:', err)
    }
  }

  const [isEditingNote, setIsEditingNote] = useState(false)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      {/* Lyric card with edit icon */}
      <div className="relative w-full max-w-lg">
        <LyricCard lyric={lyric} />

        {/* Edit lyric button - hidden when editing note */}
        {!isEditingNote && (
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute bottom-4 right-4 p-2 text-charcoal-light hover:text-charcoal transition-colors"
            title="Edit lyric"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
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

      {showEditModal && (
        <EditLyricModal
          lyric={lyric}
          onSave={handleUpdate}
          onClose={() => setShowEditModal(false)}
          allUserTags={allUserTags}
        />
      )}

      {showShareModal && (
        <ShareModal
          lyric={lyric}
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
  const { currentLyric, loading, setLyric, replaceLyric, setTheme, setLayout, setVisibility } = useLyric()

  const handleUpdate = async (data) => {
    // Update lyric content (and song/artist metadata, tags)
    await replaceLyric({
      content: data.content,
      song_title: data.song_title,
      artist_name: data.artist_name,
      tags: data.tags,
    })

    // Update theme if changed
    if (data.theme && data.theme !== currentLyric.theme) {
      await setTheme(data.theme)
    }

    // Update layout if changed
    if (data.layout && data.layout !== currentLyric.layout) {
      await setLayout(data.layout)
    }
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
      onVisibilityChange={setVisibility}
    />
  )
}
