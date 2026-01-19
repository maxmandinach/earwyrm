import { useState } from 'react'
import LyricForm from './LyricForm'
import { themes, themeList } from '../lib/themes'

function ThemePreview({ theme, lyricContent, isSelected, onClick }) {
  const previewStyle = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: '0.75rem',
    fontWeight: theme.fontWeight,
    lineHeight: theme.lineHeight,
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 text-left transition-all ${
        isSelected
          ? 'ring-2 ring-charcoal ring-offset-2 ring-offset-cream'
          : 'hover:ring-1 hover:ring-charcoal/30'
      }`}
      style={previewStyle}
    >
      <p className="line-clamp-2 mb-2">
        {lyricContent || 'Your lyric here...'}
      </p>
      <p className="text-xs mt-2 opacity-60">{theme.name}</p>
    </button>
  )
}

export default function EditLyricModal({ lyric, onSave, onClose }) {
  const [selectedTheme, setSelectedTheme] = useState(lyric.theme)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (data) => {
    setIsLoading(true)
    setError(null)
    try {
      await onSave({
        content: data.content,
        song_title: data.songTitle,
        artist_name: data.artistName,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/20">
      <div className="bg-cream w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-charcoal/10 flex justify-between items-center">
          <h2 className="text-lg font-medium text-charcoal">Change lyric</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-charcoal-light hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Lyric Form */}
          <LyricForm
            onSubmit={handleSubmit}
            initialValues={{
              content: lyric.content,
              songTitle: lyric.song_title || '',
              artistName: lyric.artist_name || '',
            }}
            submitLabel="Update lyric"
            isLoading={isLoading}
            error={error}
          />

          {/* Theme Selector */}
          <div className="mt-8 pt-8 border-t border-charcoal/10">
            <h3 className="text-sm font-medium text-charcoal mb-4">Style</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {themeList.map((theme) => (
                <ThemePreview
                  key={theme.id}
                  theme={theme}
                  lyricContent={lyric.content}
                  isSelected={selectedTheme === theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
