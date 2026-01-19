import { useState } from 'react'
import LyricForm from './LyricForm'
import ThemeSelector from './ThemeSelector'

export default function EditLyricModal({ lyric, onSave, onClose }) {
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(lyric.theme)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (data) => {
    setIsLoading(true)
    setError(null)
    try {
      await onSave({
        ...data,
        theme: selectedTheme,
      })
      onClose()
    } catch (err) {
      console.error('Error updating lyric:', err)
      setError(err.message || 'Failed to update lyric. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId)
    setShowThemeSelector(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/20">
      <div className="bg-cream w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-charcoal/10 flex justify-between items-center">
          <h2 className="text-lg font-medium text-charcoal">Edit lyric</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-charcoal-light hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <LyricForm
            onSubmit={handleSubmit}
            initialValues={{
              content: lyric.content,
              song_title: lyric.song_title || '',
              artist_name: lyric.artist_name || '',
            }}
            submitLabel="Update lyric"
            isLoading={isLoading}
            error={error}
          />

          <div className="mt-6 pt-6 border-t border-charcoal/10">
            <button
              onClick={() => setShowThemeSelector(true)}
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              Change style
            </button>
          </div>
        </div>

        {showThemeSelector && (
          <ThemeSelector
            currentTheme={selectedTheme}
            lyricContent={lyric.content}
            onSelect={handleThemeSelect}
            onClose={() => setShowThemeSelector(false)}
          />
        )}
      </div>
    </div>
  )
}
