import { useState, useRef, useEffect } from 'react'
import TagInput from './TagInput'
import CollectionPicker from './CollectionPicker'
import ModalSheet from './ModalSheet'
import PlusPaywall from './PlusPaywall'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'
import { generateCardArt } from '../lib/card-art'

export default function EditLyricModal({ lyric, onSave, onClose, allUserTags = [] }) {
  const { profile } = useAuth()
  const isPlus = profile?.subscription_tier === 'plus'
  const [content, setContent] = useState(lyric.content)
  const [songTitle, setSongTitle] = useState(lyric.song_title || '')
  const [artistName, setArtistName] = useState(lyric.artist_name || '')
  const [tags, setTags] = useState(lyric.tags || [])
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const [error, setError] = useState(null)

  // Artwork state
  const [artUrl, setArtUrl] = useState(lyric.card_art_url || null)
  const [artLoading, setArtLoading] = useState(false)
  const [artRemaining, setArtRemaining] = useState(null)
  const [artError, setArtError] = useState(null)
  const [showPaywall, setShowPaywall] = useState(false)

  const handleClear = () => {
    setContent('')
    setSongTitle('')
    setArtistName('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || saveState !== 'idle') return

    setSaveState('saving')
    setError(null)
    try {
      await onSave({
        content: content.trim(),
        songTitle: songTitle.trim() || null,
        artistName: artistName.trim() || null,
        tags: tags,
      })

      setSaveState('saved')
      setTimeout(() => {
        onClose()
      }, 600)
    } catch (err) {
      console.error('Error updating lyric:', err)
      setError(err.message || 'Failed to update lyric. Please try again.')
      setSaveState('idle')
    }
  }

  function artRemainingLabel(prefix) {
    if (artRemaining !== null) {
      return artRemaining > 0 ? `${prefix} (${artRemaining} remaining)` : 'Daily limit reached'
    }
    return prefix
  }

  async function handleGenerateArt() {
    setArtLoading(true)
    setArtError(null)
    try {
      const session = await supabase.auth.getSession()
      const accessToken = session?.data?.session?.access_token
      if (!accessToken) throw new Error('Not signed in')

      const result = await generateCardArt({
        lyricContent: content,
        noteContent: null,
        songTitle: songTitle || null,
        artistName: artistName || null,
        tags,
        lyricId: lyric.id,
      }, accessToken)

      setArtUrl(result.image_url)
      setArtRemaining(result.remaining)
    } catch (err) {
      setArtError(err.message || 'Generation failed')
    } finally {
      setArtLoading(false)
    }
  }

  async function handleDeleteArt() {
    try {
      const path = `${lyric.id}.png`
      await supabase.storage.from('card-art').remove([path])
      await supabase
        .from('lyrics')
        .update({ card_art_url: null })
        .eq('id', lyric.id)
      setArtUrl(null)
    } catch (err) {
      setArtError('Failed to delete artwork')
      console.error('Delete art error:', err)
    }
  }

  // Auto-expand textarea
  const textareaRef = useRef(null)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(100, textareaRef.current.scrollHeight) + 'px'
    }
  }, [content])

  return (
    <ModalSheet onClose={onClose} title="Edit lyric" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col">
          {error && (
            <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          {/* Signature style card */}
          <div className="w-full max-w-md mx-auto">
            <div
              className="p-6 border border-charcoal/10"
              style={{ backgroundColor: 'var(--surface-elevated, #F5F0E8)' }}
            >
              {/* Lyric */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste or type a lyric"
                rows={4}
                className="w-full bg-transparent focus:outline-none resize-none placeholder:opacity-60"
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: '1.875rem',
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
                autoFocus
              />

              {/* Song & Artist - always visible, integrated */}
              <div className="mt-4 pt-4 border-t border-charcoal/10 space-y-2">
                <input
                  type="text"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="Song title"
                  className="w-full bg-transparent focus:outline-none placeholder:opacity-50"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: '0.9375rem',
                  }}
                />
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Artist"
                  className="w-full bg-transparent focus:outline-none placeholder:opacity-50"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
            </div>

            {content && (
              <button
                type="button"
                onClick={handleClear}
                className="mt-2 text-xs text-charcoal/40 hover:text-charcoal transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Tags Section - signature style */}
          <div className="mt-6 w-full max-w-md mx-auto">
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={allUserTags}
              showSuggestionsOnFocus
            />
          </div>

          {/* Collections Section */}
          <div className="mt-6 pt-6 border-t border-charcoal/10 w-full max-w-md mx-auto">
            <h3 className="text-sm font-medium text-charcoal mb-3">Collections</h3>
            <CollectionPicker lyricId={lyric.id} />
          </div>

          {/* Artwork Section */}
          <div className="mt-6 pt-6 border-t border-charcoal/10 w-full max-w-md mx-auto">
            <h3 className="text-sm font-medium text-charcoal mb-3">Artwork</h3>
            {artUrl ? (
              <div className="flex items-center gap-4">
                <img
                  src={artUrl}
                  alt="Lyric artwork"
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={handleGenerateArt}
                    disabled={artLoading}
                    className="text-xs text-left hover:opacity-70 transition-opacity disabled:opacity-40"
                    style={{ color: 'var(--accent, #B8A99A)' }}
                  >
                    {artLoading ? 'Generating...' : artRemainingLabel('Regenerate')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteArt}
                    className="text-xs text-left text-red-400 hover:text-red-500 transition-colors"
                  >
                    Delete artwork
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => isPlus ? handleGenerateArt() : setShowPaywall(true)}
                disabled={artLoading}
                className="text-xs hover:opacity-70 transition-opacity disabled:opacity-40"
                style={{ color: 'var(--accent, #B8A99A)' }}
              >
                {artLoading ? '✦ Generating...' : `✦ ${artRemainingLabel('Generate artwork')}`}
              </button>
            )}
            {artError && (
              <p className="text-xs text-red-400 mt-2">{artError}</p>
            )}
          </div>

          {showPaywall && <PlusPaywall onClose={() => setShowPaywall(false)} />}

          {/* Save Button - ceremonial */}
          <div className="mt-8 pt-8 flex justify-center">
            <button
              type="submit"
              disabled={!content.trim() || saveState !== 'idle'}
              className="px-12 py-4 text-lg font-medium transition-all duration-300"
              style={{
                fontFamily: "'Caveat', cursive",
                backgroundColor: saveState === 'saved' ? 'var(--text-primary, #2C2825)' : 'var(--surface-elevated, #F5F0E8)',
                color: saveState === 'saved' ? 'var(--surface-bg, #F5F0E8)' : 'var(--text-primary, #2C2825)',
                border: '2px solid var(--text-primary, #2C2825)',
                opacity: !content.trim() ? 0.4 : 1,
                cursor: !content.trim() ? 'not-allowed' : 'pointer',
                transform: saveState === 'saved' ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && 'Saved'}
              {saveState === 'idle' && 'Save'}
            </button>
          </div>
        </form>
    </ModalSheet>
  )
}
