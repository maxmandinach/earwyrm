import { useState, useRef, useEffect } from 'react'
import SuggestMatches from './SuggestMatches'
import MusicBrainzAutocomplete from './MusicBrainzAutocomplete'
import useLyricSuggestion from '../hooks/useLyricSuggestion'
import LyricBrowser from './LyricBrowser'

export default function LyricForm({ onSubmit, initialValues = {}, isLoading = false, error = null }) {
  const [content, setContent] = useState(initialValues.content || '')
  const [songTitle, setSongTitle] = useState(initialValues.songTitle || '')
  const [artistName, setArtistName] = useState(initialValues.artistName || '')
  const [canonicalLyricId, setCanonicalLyricId] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [preMatchContent, setPreMatchContent] = useState('')
  const [coverArtUrl, setCoverArtUrl] = useState(null)
  const [musicbrainzData, setMusicbrainzData] = useState(null)
  const [artistMbid, setArtistMbid] = useState(null) // MusicBrainz artist ID for precise song search
  const [activeField, setActiveField] = useState(null) // 'artist' | 'song' | null
  const [showLyricBrowser, setShowLyricBrowser] = useState(false)
  const textareaRef = useRef(null)
  const blurTimeoutRef = useRef(null)

  // Genius lyrics search — suggests artist/song based on lyric text
  const { suggestions: lyricSuggestions, loading: lyricSuggestionLoading, dismiss: dismissSuggestion } = useLyricSuggestion(content, artistName, songTitle)

  const handleAcceptLyricSuggestion = (suggestion) => {
    if (suggestion.artist) setArtistName(suggestion.artist)
    if (suggestion.title) setSongTitle(suggestion.title)
    if (suggestion.albumArt) setCoverArtUrl(suggestion.albumArt)
    dismissSuggestion()
  }

  // Clear any pending blur timeout when focusing a new field
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
  }

  const handleArtistSelect = (artist) => {
    setArtistName(artist.name)
    setArtistMbid(artist.id) // Store MBID for precise song search
    setActiveField(null) // Close dropdown
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
    setActiveField(null) // Close dropdown
  }

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(100, textareaRef.current.scrollHeight) + 'px'
    }
  }, [content])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      content: content.trim(),
      songTitle: songTitle.trim() || null,
      artistName: artistName.trim() || null,
      canonicalLyricId,
      coverArtUrl,
      musicbrainzRecordingId: musicbrainzData?.recordingId || null,
      musicbrainzReleaseId: musicbrainzData?.releaseId || null,
      album: musicbrainzData?.album || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      {error && (
        <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      {/* Signature style card */}
      <div
        className="p-6 border border-charcoal/10"
        style={{ backgroundColor: 'var(--surface-elevated, #F5F0E8)' }}
      >
        {/* Lyric */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { if (!isLocked) setContent(e.target.value.slice(0, 500)) }}
            readOnly={isLocked}
            placeholder="Paste or type a lyric"
            rows={4}
            maxLength={500}
            className={`w-full bg-transparent focus:outline-none resize-none placeholder:opacity-60 ${isLocked ? 'opacity-70' : ''}`}
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1.875rem',
              fontWeight: 500,
              lineHeight: 1.5,
              color: 'var(--text-primary, #2C2825)',
            }}
            autoFocus={!isLocked}
          />
          {content.length > 400 && !isLocked && (
            <p className="text-xs text-charcoal/30 text-right mt-1">{content.length}/500</p>
          )}
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

        {/* Song & Artist - integrated */}
        <div className="mt-4 pt-4 border-t border-charcoal/10 space-y-2">
          <div className="flex items-center gap-3">
            {/* Cover art preview */}
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
                  setArtistMbid(null) // Clear MBID when manually editing
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
                  color: 'var(--text-secondary, #6B635A)',
                }}
              />
              <input
                type="text"
                value={songTitle}
                onChange={(e) => {
                  setSongTitle(e.target.value)
                  // Clear MusicBrainz data when manually editing
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
                  color: 'var(--text-secondary, #6B635A)',
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

          {/* Browse full lyrics button */}
          {artistName.trim() && songTitle.trim() && (
            <button
              type="button"
              onClick={() => setShowLyricBrowser(true)}
              className="flex items-center gap-1.5 mt-2 text-[#B8A99A] hover:opacity-70 transition-opacity"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.8125rem' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              browse full lyrics
            </button>
          )}
        </div>
      </div>

      {content && (
        <button
          type="button"
          onClick={() => {
            setContent('')
            setSongTitle('')
            setArtistName('')
          }}
          className="mt-2 text-xs text-charcoal/40 hover:text-charcoal transition-colors"
        >
          Clear
        </button>
      )}

      {/* Save button - ceremonial */}
      <div className="mt-8 flex justify-center">
        <button
          type="submit"
          disabled={!content.trim() || isLoading}
          className="px-12 py-4 text-lg font-medium transition-all duration-300"
          style={{
            fontFamily: "'Caveat', cursive",
            backgroundColor: isLoading ? 'var(--text-primary, #2C2825)' : 'var(--surface-elevated, #F5F0E8)',
            color: isLoading ? 'var(--surface-bg, #F5F0E8)' : 'var(--text-primary, #2C2825)',
            border: '2px solid var(--text-primary, #2C2825)',
            opacity: !content.trim() ? 0.4 : 1,
            cursor: !content.trim() || isLoading ? 'not-allowed' : 'pointer',
            transform: isLoading ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>

      {showLyricBrowser && (
        <LyricBrowser
          songTitle={songTitle}
          artistName={artistName}
          onSelect={(text) => {
            setContent(text)
            setIsLocked(true)
          }}
          onClose={() => setShowLyricBrowser(false)}
        />
      )}
    </form>
  )
}
