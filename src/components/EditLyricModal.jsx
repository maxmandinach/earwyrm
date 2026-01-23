import { useState } from 'react'
import { themeList } from '../lib/themes'
import { layoutList } from '../lib/layouts'
import TagInput from './TagInput'
import CollectionPicker from './CollectionPicker'

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

function LayoutWireframe({ layoutId }) {
  // Abstract wireframes showing text positioning
  const wireframes = {
    standard: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        {/* Centered lines */}
        <rect x="10" y="16" width="20" height="2" fill="currentColor" opacity="0.6" />
        <rect x="12" y="20" width="16" height="2" fill="currentColor" opacity="0.6" />
        <rect x="14" y="26" width="12" height="1" fill="currentColor" opacity="0.3" />
      </svg>
    ),
    editorial: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        {/* Bottom-left lyric */}
        <rect x="4" y="24" width="18" height="2" fill="currentColor" opacity="0.6" />
        <rect x="4" y="28" width="14" height="2" fill="currentColor" opacity="0.6" />
        <rect x="4" y="32" width="10" height="2" fill="currentColor" opacity="0.6" />
        {/* Vertical attribution on right */}
        <rect x="34" y="12" width="2" height="16" fill="currentColor" opacity="0.3" />
      </svg>
    ),
    brutalist: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        {/* Large centered text */}
        <rect x="4" y="14" width="32" height="4" fill="currentColor" opacity="0.7" />
        <rect x="6" y="20" width="28" height="4" fill="currentColor" opacity="0.7" />
        <rect x="14" y="32" width="12" height="1" fill="currentColor" opacity="0.3" />
      </svg>
    ),
    cinematic: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        {/* Letterbox bars */}
        <rect x="0" y="0" width="40" height="5" fill="currentColor" opacity="0.15" />
        <rect x="0" y="35" width="40" height="5" fill="currentColor" opacity="0.15" />
        {/* Bottom-third centered text */}
        <rect x="10" y="24" width="20" height="2" fill="currentColor" opacity="0.6" />
        <rect x="12" y="28" width="16" height="2" fill="currentColor" opacity="0.6" />
      </svg>
    ),
  }

  return wireframes[layoutId] || wireframes.standard
}

function LayoutPreview({ layout, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center p-3 border-2 transition-all ${
        isSelected
          ? 'border-charcoal bg-charcoal/5'
          : 'border-charcoal/20 hover:border-charcoal/40'
      }`}
    >
      <div className="w-12 h-12 text-charcoal">
        <LayoutWireframe layoutId={layout.id} />
      </div>
      <p className="text-xs mt-2 text-charcoal/60">{layout.name}</p>
    </button>
  )
}

export default function EditLyricModal({ lyric, onSave, onClose, allUserTags = [] }) {
  const [content, setContent] = useState(lyric.content)
  const [songTitle, setSongTitle] = useState(lyric.song_title || '')
  const [artistName, setArtistName] = useState(lyric.artist_name || '')
  const [tags, setTags] = useState(lyric.tags || [])
  const [showOptional, setShowOptional] = useState(
    !!(lyric.song_title || lyric.artist_name)
  )
  const [selectedTheme, setSelectedTheme] = useState(lyric.theme)
  const [selectedLayout, setSelectedLayout] = useState(lyric.layout || 'standard')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleClear = () => {
    setContent('')
    setSongTitle('')
    setArtistName('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      await onSave({
        content: content.trim(),
        song_title: songTitle.trim() || null,
        artist_name: artistName.trim() || null,
        tags: tags,
        theme: selectedTheme,
        layout: selectedLayout,
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 flex flex-col">
          {error && (
            <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          {/* Lyric Input */}
          <div className="w-full max-w-md mx-auto">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type a lyric"
              rows={4}
              className="w-full px-4 py-3 text-lg bg-transparent border border-charcoal/20
                         focus:border-charcoal/40 focus:outline-none resize-none
                         placeholder:text-charcoal-light/50 text-charcoal"
              autoFocus
            />

            {content && (
              <button
                type="button"
                onClick={handleClear}
                className="mt-2 text-xs text-charcoal-light hover:text-charcoal transition-colors"
              >
                Clear
              </button>
            )}

            {!showOptional ? (
              <button
                type="button"
                onClick={() => setShowOptional(true)}
                className="mt-3 text-sm text-charcoal-light hover:text-charcoal transition-colors"
              >
                + Add song & artist
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="Song title (optional)"
                  className="w-full px-4 py-2 text-sm bg-transparent border border-charcoal/20
                             focus:border-charcoal/40 focus:outline-none
                             placeholder:text-charcoal-light/50 text-charcoal"
                />
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Artist (optional)"
                  className="w-full px-4 py-2 text-sm bg-transparent border border-charcoal/20
                             focus:border-charcoal/40 focus:outline-none
                             placeholder:text-charcoal-light/50 text-charcoal"
                />
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="mt-8 pt-8 border-t border-charcoal/10 w-full max-w-md mx-auto">
            <h3 className="text-sm font-medium text-charcoal mb-3">Tags</h3>
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={allUserTags}
            />
            <p className="text-xs text-charcoal-light/60 mt-2">
              Add labels like "Cosmic", "Melancholy", or "90s"
            </p>
          </div>

          {/* Theme Selector */}
          <div className="mt-8 pt-8 border-t border-charcoal/10">
            <h3 className="text-sm font-medium text-charcoal mb-4">Style</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {themeList.map((theme) => (
                <ThemePreview
                  key={theme.id}
                  theme={theme}
                  lyricContent={content || lyric.content}
                  isSelected={selectedTheme === theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                />
              ))}
            </div>
          </div>

          {/* Layout Selector */}
          <div className="mt-8 pt-8 border-t border-charcoal/10">
            <h3 className="text-sm font-medium text-charcoal mb-4">Layout</h3>
            <div className="grid grid-cols-4 gap-3">
              {layoutList.map((layout) => (
                <LayoutPreview
                  key={layout.id}
                  layout={layout}
                  isSelected={selectedLayout === layout.id}
                  onClick={() => setSelectedLayout(layout.id)}
                />
              ))}
            </div>
          </div>

          {/* Collections Section */}
          <div className="mt-8 pt-8 border-t border-charcoal/10 w-full max-w-md mx-auto">
            <h3 className="text-sm font-medium text-charcoal mb-3">Collections</h3>
            <CollectionPicker lyricId={lyric.id} />
          </div>

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-charcoal/10">
            <button
              type="submit"
              disabled={!content.trim() || isLoading}
              className="w-full max-w-md mx-auto py-3 text-sm font-medium text-charcoal
                         border border-charcoal/30 hover:border-charcoal/60
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              {isLoading ? 'Saving...' : 'Update lyric'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
