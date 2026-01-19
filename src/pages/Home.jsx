import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import LyricCard from '../components/LyricCard'
import LyricForm from '../components/LyricForm'
import ThemeSelector from '../components/ThemeSelector'
import ShareModal from '../components/ShareModal'
import VisibilityToggle from '../components/VisibilityToggle'
import { getRandomPrompt } from '../lib/utils'

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

function LyricView({ lyric, onReplace, onThemeChange, onVisibilityChange }) {
  const { profile } = useAuth()
  const [isReplacing, setIsReplacing] = useState(false)
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleReplace = async (data) => {
    setIsLoading(true)
    setError(null)
    try {
      await onReplace(data)
      setIsReplacing(false)
    } catch (err) {
      console.error('Error replacing lyric:', err)
      setError(err.message || 'Failed to replace lyric. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeSelect = async (themeId) => {
    try {
      await onThemeChange(themeId)
    } catch (err) {
      console.error('Error changing theme:', err)
    }
  }

  const handleVisibilityChange = async (isPublic) => {
    try {
      await onVisibilityChange(isPublic)
    } catch (err) {
      console.error('Error changing visibility:', err)
    }
  }

  if (isReplacing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <p className="text-lg text-charcoal mb-8 text-center">
          Replace with a new lyric
        </p>

        <LyricForm
          onSubmit={handleReplace}
          submitLabel="Replace lyric"
          isLoading={isLoading}
          error={error}
        />

        <button
          onClick={() => setIsReplacing(false)}
          className="mt-6 text-sm text-charcoal-light hover:text-charcoal transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <LyricCard lyric={lyric} />

      <div className="mt-8 flex flex-col items-center gap-4">
        <button
          onClick={() => setIsReplacing(true)}
          className="text-sm text-charcoal hover:text-charcoal/60 transition-colors"
        >
          Replace lyric
        </button>

        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={() => setShowThemeSelector(true)}
            className="text-charcoal-light hover:text-charcoal transition-colors"
          >
            Change style
          </button>

          <VisibilityToggle
            isPublic={lyric.is_public}
            onChange={onVisibilityChange}
            showHelper={true}
          />

          <button
            onClick={() => setShowShareModal(true)}
            className="text-charcoal-light hover:text-charcoal transition-colors"
          >
            Share
          </button>
        </div>
      </div>

      {showThemeSelector && (
        <ThemeSelector
          currentTheme={lyric.theme}
          lyricContent={lyric.content}
          onSelect={handleThemeSelect}
          onClose={() => setShowThemeSelector(false)}
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
  const { currentLyric, loading, setLyric, replaceLyric, setTheme, setVisibility } = useLyric()

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
      onReplace={replaceLyric}
      onThemeChange={setTheme}
      onVisibilityChange={setVisibility}
    />
  )
}
