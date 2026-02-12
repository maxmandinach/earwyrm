import { useState, useRef, useEffect } from 'react'
import TagInput from './TagInput'
import ModalSheet from './ModalSheet'
import SuggestMatches from './SuggestMatches'
import MusicBrainzAutocomplete from './MusicBrainzAutocomplete'
import useLyricSuggestion from '../hooks/useLyricSuggestion'

export default function ReplaceModal({ onReplace, onClose, allUserTags = [] }) {
  const [content, setContent] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [artistName, setArtistName] = useState('')
  const [tags, setTags] = useState([])
  const [canonicalLyricId, setCanonicalLyricId] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [preMatchContent, setPreMatchContent] = useState('')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const [error, setError] = useState(null)
  const [activeField, setActiveField] = useState(null)
  const [coverArtUrl, setCoverArtUrl] = useState(null)
  const [musicbrainzData, setMusicbrainzData] = useState(null)
  const [artistMbid, setArtistMbid] = useState(null)
  const blurTimeoutRef = useRef(null)

  // Genius lyrics search — suggests artist/song based on lyric text
  const { suggestions: lyricSuggestions, loading: lyricSuggestionLoading, dismiss: dismissSuggestion } = useLyricSuggestion(content, artistName, songTitle)

  const handleAcceptLyricSuggestion = (suggestion) => {
    if (suggestion.artist) setArtistName(suggestion.artist)
    if (suggestion.title) setSongTitle(suggestion.title)
    if (suggestion.albumArt) setCoverArtUrl(suggestion.albumArt)
    dismissSuggestion()
  }

  const handleFieldFocus = (field) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setActiveField(field)
  }

  const handleFieldBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setActiveField(null)
      blurTimeoutRef.current = null
    }, 200)
  }

  const handleMatchSelect = (match) => {
    if (match) {
      setPreMatchContent(content)
      setContent(match.content)
      if (match.artistName) setArtistName(match.artistName)
      if (match.songTitle) setSongTitle(match.songTitle)
      setCanonicalLyricId(match.id)
      setIsLocked(true)
    } else if (isLocked) {
      setContent(preMatchContent)
      setArtistName('')
      setCanonicalLyricId(null)
      setIsLocked(false)
    } else {
      setCanonicalLyricId(null)
    }
  }

  const handleClearLock = () => {
    setContent('')
    setSongTitle('')
    setArtistName('')
    setCanonicalLyricId(null)
    setIsLocked(false)
    setCoverArtUrl(null)
    setMusicbrainzData(null)
    setArtistMbid(null)
  }

  const handleArtistSelect = (artist) => {
    setArtistName(artist.name)
    setArtistMbid(artist.id)
    setActiveField(null)
  }

  const handleSongSelect = (data) => {
    setArtistName(data.artist || '')
    setSongTitle(data.song || '')
    setCoverArtUrl(data.coverArtUrl)
    setMusicbrainzData({
      recordingId: data.musicbrainzRecordingId,
      releaseId: data.musicbrainzReleaseId,
      album: data.album,
    })
    setActiveField(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || saveState !== 'idle') return

    setSaveState('saving')
    setError(null)
    try {
      await onReplace({
        content: content.trim(),
        songTitle: songTitle.trim() || null,
        artistName: artistName.trim() || null,
        tags: tags,
        canonicalLyricId,
        coverArtUrl,
        musicbrainzRecordingId: musicbrainzData?.recordingId || null,
        musicbrainzReleaseId: musicbrainzData?.releaseId || null,
        album: musicbrainzData?.album || null,
      })

      setSaveState('saved')
      setTimeout(() => {
        onClose()
      }, 600)
    } catch (err) {
      console.error('Error creating lyric:', err)
      setError(err.message || 'Failed to save lyric. Please try again.')
      setSaveState('idle')
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
    <ModalSheet onClose={onClose} title="New lyric" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col">
          {/* Gentle note */}
          <p
            className="mb-6 text-center opacity-70"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1.125rem',
              color: 'var(--text-secondary, #6B635A)',
            }}
          >
            Your current lyric will move to Memory Lane
          </p>

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
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => { if (!isLocked) setContent(e.target.value) }}
                  readOnly={isLocked}
                  placeholder="What's stuck in your head?"
                  rows={4}
                  className={`w-full bg-transparent focus:outline-none resize-none placeholder:opacity-60 ${isLocked ? 'opacity-70' : ''}`}
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: '1.875rem',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                  autoFocus={!isLocked}
                />
                {isLocked && (
                  <button
                    type="button"
                    onClick={handleClearLock}
                    className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal/10 hover:bg-charcoal/20 text-charcoal/60 hover:text-charcoal transition-colors"
                    aria-label="Clear matched lyric"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Suggest matches — searches as user types lyric or song title */}
              {!isLocked && (
                <SuggestMatches content={content} songTitle={songTitle} onSelect={handleMatchSelect} />
              )}

              {/* Genius lyric suggestions — auto-identifies song from lyrics */}
              {lyricSuggestions.length > 0 && !isLocked && !artistName && !songTitle && (
                <div className="mt-3 space-y-1.5">
                  {lyricSuggestions.map((suggestion, i) => (
                    <button
                      key={`${suggestion.title}-${suggestion.artist}`}
                      type="button"
                      onClick={() => handleAcceptLyricSuggestion(suggestion)}
                      className={`w-full flex items-center gap-3 px-3 rounded text-left transition-all hover:opacity-80 ${
                        i === 0 ? 'py-2.5' : 'py-1.5'
                      }`}
                      style={{
                        backgroundColor: i === 0 ? 'var(--text-primary, #2C2825)' : 'transparent',
                        color: i === 0 ? 'var(--surface-elevated, #F5F0E8)' : 'var(--text-secondary, #6B635A)',
                        border: i === 0 ? 'none' : '1px solid var(--text-primary, #2C2825)1a',
                      }}
                    >
                      {suggestion.albumArt && (
                        <img
                          src={suggestion.albumArt}
                          alt=""
                          className={`rounded flex-shrink-0 ${i === 0 ? 'w-10 h-10' : 'w-7 h-7'}`}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${i === 0 ? 'text-sm' : 'text-xs'}`}>
                          {suggestion.title}
                        </p>
                        <p className={`opacity-70 truncate ${i === 0 ? 'text-xs' : 'text-[11px]'}`}>
                          {suggestion.artist}
                        </p>
                      </div>
                      {i === 0 && <span className="text-xs opacity-50 flex-shrink-0">tap to fill</span>}
                    </button>
                  ))}
                  <p className="text-[10px] text-charcoal/25 text-center pt-0.5">via Genius</p>
                </div>
              )}
              {lyricSuggestionLoading && !artistName && !songTitle && !isLocked && content.trim().length >= 15 && (
                <p className="mt-2 text-xs text-charcoal/30 text-center">identifying song...</p>
              )}

              {/* Song & Artist */}
              <div className="mt-4 pt-4 border-t border-charcoal/10 space-y-2">
                <div className="flex items-center gap-3">
                  {coverArtUrl && (
                    <div
                      className="w-12 h-12 flex-shrink-0 rounded"
                      style={{
                        backgroundImage: `url(${coverArtUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={artistName}
                      onChange={(e) => {
                        setArtistName(e.target.value)
                        setArtistMbid(null)
                        if (musicbrainzData) {
                          setCoverArtUrl(null)
                          setMusicbrainzData(null)
                        }
                      }}
                      onFocus={() => handleFieldFocus('artist')}
                      onBlur={handleFieldBlur}
                      placeholder="Artist"
                      className="w-full bg-transparent focus:outline-none placeholder:opacity-50"
                      style={{
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        fontSize: '0.9375rem',
                      }}
                    />
                    <input
                      type="text"
                      value={songTitle}
                      onChange={(e) => {
                        setSongTitle(e.target.value)
                        if (musicbrainzData) {
                          setCoverArtUrl(null)
                          setMusicbrainzData(null)
                        }
                      }}
                      onFocus={() => handleFieldFocus('song')}
                      onBlur={handleFieldBlur}
                      placeholder="Song title"
                      className="w-full bg-transparent focus:outline-none placeholder:opacity-50"
                      style={{
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        fontSize: '0.9375rem',
                      }}
                    />
                  </div>
                </div>

                {/* MusicBrainz autocomplete */}
                <MusicBrainzAutocomplete
                  artistValue={artistName}
                  artistId={artistMbid}
                  songValue={songTitle}
                  activeField={activeField}
                  onSelectArtist={handleArtistSelect}
                  onSelectSong={handleSongSelect}
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="mt-6 w-full max-w-md mx-auto">
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={allUserTags}
              showSuggestionsOnFocus
            />
          </div>

          {/* Save Button */}
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
              {saveState === 'saved' && 'Saved!'}
              {saveState === 'idle' && 'Save & Replace'}
            </button>
          </div>
        </form>
    </ModalSheet>
  )
}
