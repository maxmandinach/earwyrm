import { useState, useEffect } from 'react'
import { themeList } from '../lib/themes'
import TagInput from './TagInput'
import CollectionPicker from './CollectionPicker'
import { useLyric } from '../contexts/LyricContext'

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

export default function EditLyricModal({ lyric, onSave, onClose, allUserTags = [] }) {
  const { fetchNoteForLyric, saveNote } = useLyric()
  const [content, setContent] = useState(lyric.content)
  const [songTitle, setSongTitle] = useState(lyric.song_title || '')
  const [artistName, setArtistName] = useState(lyric.artist_name || '')
  const [tags, setTags] = useState(lyric.tags || [])
  const [noteContent, setNoteContent] = useState('')
  const [noteLoading, setNoteLoading] = useState(true)
  const [showOptional, setShowOptional] = useState(
    !!(lyric.song_title || lyric.artist_name)
  )
  const [selectedTheme, setSelectedTheme] = useState(lyric.theme)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load note when modal opens
  useEffect(() => {
    async function loadNote() {
      setNoteLoading(true)
      try {
        const note = await fetchNoteForLyric(lyric.id)
        setNoteContent(note?.content || '')
      } catch (err) {
        console.error('Error loading note:', err)
      } finally {
        setNoteLoading(false)
      }
    }

    loadNote()
  }, [lyric.id])

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
      // Save lyric data
      await onSave({
        content: content.trim(),
        song_title: songTitle.trim() || null,
        artist_name: artistName.trim() || null,
        tags: tags,
        theme: selectedTheme,
      })

      // Save note separately
      if (noteContent.trim()) {
        await saveNote(lyric.id, noteContent)
      } else {
        // If note is empty, delete it (handled in saveNote)
        await saveNote(lyric.id, '')
      }

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

          {/* Collections Section */}
          <div className="mt-8 pt-8 border-t border-charcoal/10 w-full max-w-md mx-auto">
            <h3 className="text-sm font-medium text-charcoal mb-3">Collections</h3>
            <CollectionPicker lyricId={lyric.id} />
          </div>

          {/* Private Note Section */}
          <div className="mt-8 pt-8 border-t border-charcoal/10 w-full max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-charcoal">Private note</h3>
              <span className="text-xs text-charcoal-light/60">Only visible to you</span>
            </div>
            {noteLoading ? (
              <p className="text-sm text-charcoal-light">Loading note...</p>
            ) : (
              <>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  maxLength={500}
                  placeholder="Why does this lyric resonate with you?"
                  rows={3}
                  className="w-full px-4 py-3 text-sm bg-transparent border border-charcoal/20
                             focus:border-charcoal/40 focus:outline-none resize-none
                             placeholder:text-charcoal-light/50 text-charcoal"
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-charcoal-light/50">
                    Keep personal reflections, memories, or context
                  </p>
                  <span className="text-xs text-charcoal-light/50">
                    {noteContent.length}/500
                  </span>
                </div>
              </>
            )}
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
