import { useState, useEffect, useRef } from 'react'
import ModalSheet from './ModalSheet'
import { searchByLyrics } from '../lib/genius'
import { recognizeAudio } from '../lib/audd'
import useAudioRecorder from '../hooks/useAudioRecorder'
import { useCollection } from '../contexts/CollectionContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'

function ResultCard({ result, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-all hover:opacity-80"
      style={{
        backgroundColor: selected
          ? 'var(--text-primary, #2C2825)'
          : 'var(--surface-elevated, #F5F0E8)',
        color: selected
          ? 'var(--surface-elevated, #F5F0E8)'
          : 'var(--text-primary, #2C2825)',
        border: `1px solid ${selected ? 'transparent' : 'var(--border-subtle, rgba(0,0,0,0.06))'}`,
      }}
    >
      {result.albumArt && (
        <img
          src={result.albumArt}
          alt=""
          className="w-10 h-10 rounded flex-shrink-0"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{result.title}</p>
        <p className="text-xs opacity-70 truncate">{result.artist}</p>
      </div>
      {selected && <span className="text-xs opacity-50 flex-shrink-0">selected</span>}
    </button>
  )
}

function LyricsTab({ onResultSelect, selectedResult }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 10) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const hits = await searchByLyrics(query)
        // Dedupe
        const seen = new Set()
        const unique = hits.filter(r => {
          const key = `${r.title}::${r.artist}`.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setResults(unique.slice(0, 3))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 800)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div className="space-y-4">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="type the lyrics you remember..."
        rows={3}
        autoFocus
        className="w-full bg-transparent focus:outline-none resize-none placeholder:opacity-40"
        style={{
          fontFamily: "'Caveat', cursive",
          fontSize: '1.25rem',
          lineHeight: 1.6,
          borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
          paddingBottom: '0.75rem',
        }}
      />

      {searching && query.trim().length >= 10 && (
        <p className="text-xs text-charcoal/30 text-center">searching...</p>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((r) => (
            <ResultCard
              key={`${r.title}-${r.artist}`}
              result={r}
              selected={selectedResult?.title === r.title && selectedResult?.artist === r.artist}
              onSelect={onResultSelect}
            />
          ))}
          <p className="text-[10px] text-charcoal/25 text-center pt-0.5">via Genius</p>
        </div>
      )}

      {!searching && query.trim().length >= 10 && results.length === 0 && (
        <p className="text-xs text-charcoal/30 text-center">
          no matches found — try different lyrics
        </p>
      )}
    </div>
  )
}

function ListenTab({ onResultSelect, selectedResult }) {
  const {
    startRecording, stopRecording, reset,
    isRecording, secondsElapsed, error, audioBase64, maxDuration,
  } = useAudioRecorder()
  const [recognizing, setRecognizing] = useState(false)
  const [result, setResult] = useState(null)
  const [noMatch, setNoMatch] = useState(false)

  // When audio is captured, send for recognition
  useEffect(() => {
    if (!audioBase64) return

    async function recognize() {
      setRecognizing(true)
      setNoMatch(false)
      try {
        const match = await recognizeAudio(audioBase64)
        if (match) {
          setResult(match)
          onResultSelect(match)
        } else {
          setNoMatch(true)
        }
      } catch {
        setNoMatch(true)
      } finally {
        setRecognizing(false)
      }
    }
    recognize()
  }, [audioBase64])

  const handleTryAgain = () => {
    reset()
    setResult(null)
    setNoMatch(false)
  }

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      {/* Mic button */}
      {!result && !recognizing && (
        <>
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all"
            style={{
              backgroundColor: isRecording
                ? 'var(--text-primary, #2C2825)'
                : 'var(--surface-elevated, #F5F0E8)',
              color: isRecording
                ? 'var(--surface-elevated, #F5F0E8)'
                : 'var(--text-primary, #2C2825)',
              border: '2px solid var(--text-primary, #2C2825)',
            }}
          >
            {/* Pulse ring when recording */}
            {isRecording && (
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  border: '2px solid var(--text-primary, #2C2825)',
                  opacity: 0.3,
                }}
              />
            )}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>

          <p
            className="text-sm text-center"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1.1rem',
              color: 'var(--text-secondary, #6B635A)',
            }}
          >
            {isRecording
              ? `listening... ${maxDuration - secondsElapsed}s`
              : 'tap to listen'}
          </p>
        </>
      )}

      {/* Recognizing state */}
      {recognizing && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'var(--border-subtle, rgba(0,0,0,0.1))',
              borderTopColor: 'var(--text-primary, #2C2825)',
            }}
          />
          <p className="text-xs text-charcoal/40">identifying song...</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="w-full">
          <ResultCard
            result={result}
            selected={selectedResult?.title === result.title && selectedResult?.artist === result.artist}
            onSelect={onResultSelect}
          />
        </div>
      )}

      {/* No match */}
      {noMatch && (
        <div className="text-center space-y-3 py-4">
          <p className="text-sm text-charcoal/40">couldn't find a match</p>
          <button
            type="button"
            onClick={handleTryAgain}
            className="text-xs text-charcoal/50 hover:text-charcoal/70 transition-colors underline"
          >
            try again?
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600/70 text-center max-w-xs">{error}</p>
      )}
    </div>
  )
}

function CollectionPicker({ onSelect, onCreateNew }) {
  const { collections, loading } = useCollection()

  // Filter out smart collections (can't manually add to them)
  const manualCollections = collections.filter(c => !c.is_smart)

  if (loading) {
    return <p className="text-xs text-charcoal/30 text-center py-4">loading collections...</p>
  }

  return (
    <div className="space-y-1">
      {manualCollections.map((col) => (
        <button
          key={col.id}
          type="button"
          onClick={() => onSelect(col)}
          className="w-full text-left px-3 py-2.5 text-sm hover:opacity-80 transition-all rounded"
          style={{
            backgroundColor: 'var(--surface-elevated, #F5F0E8)',
            border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
          }}
        >
          {col.name}
        </button>
      ))}
      <button
        type="button"
        onClick={onCreateNew}
        className="w-full text-left px-3 py-2.5 text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors"
      >
        + create new collection
      </button>
    </div>
  )
}

export default function IdentifySongModal({ onClose, onSaveAsEarwyrm }) {
  const { user } = useAuth()
  const { addLyricToCollection, createCollection, fetchCollections } = useCollection()
  const [tab, setTab] = useState('lyrics') // 'lyrics' | 'listen'
  const [selectedResult, setSelectedResult] = useState(null)
  const [showCollectionPicker, setShowCollectionPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')

  const handleResultSelect = (result) => {
    setSelectedResult(result)
    setShowCollectionPicker(false)
    setSaved(false)
  }

  const handleSaveAsEarwyrm = () => {
    if (!selectedResult) return
    onSaveAsEarwyrm({
      songTitle: selectedResult.title,
      artistName: selectedResult.artist,
      coverArtUrl: selectedResult.albumArt,
    })
  }

  const handleAddToCollection = async (collection) => {
    if (!selectedResult || !user || saving) return
    setSaving(true)
    try {
      // Create a saved lyric record
      const { data: lyric, error } = await supabase
        .from('lyrics')
        .insert({
          user_id: user.id,
          content: selectedResult.title || 'Untitled',
          song_title: selectedResult.title || null,
          artist_name: selectedResult.artist || null,
          cover_art_url: selectedResult.albumArt || null,
          is_current: false,
          is_saved: true,
        })
        .select()
        .single()

      if (error) throw error

      // Add to collection
      await addLyricToCollection(lyric.id, collection.id)

      setSaved(true)
      setShowCollectionPicker(false)
      // Auto-close after brief confirmation
      setTimeout(() => {
        setSaved(false)
      }, 2000)
    } catch (err) {
      console.error('Error saving to collection:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNewCollection = async () => {
    if (!newCollectionName.trim()) return
    try {
      const col = await createCollection({ name: newCollectionName.trim() })
      setCreatingCollection(false)
      setNewCollectionName('')
      await handleAddToCollection(col)
    } catch (err) {
      console.error('Error creating collection:', err)
    }
  }

  const tabStyle = (active) => ({
    fontFamily: "'Caveat', cursive",
    fontSize: '1.1rem',
    color: active ? 'var(--text-primary, #2C2825)' : 'var(--text-secondary, #6B635A)',
    borderBottom: active ? '2px solid var(--text-primary, #2C2825)' : '2px solid transparent',
    opacity: active ? 1 : 0.5,
  })

  return (
    <ModalSheet onClose={onClose} title="what's this song?" maxWidth="max-w-lg">
      <div className="p-5 sm:p-6">
        {/* Tabs */}
        <div className="flex justify-center gap-6 mb-6">
          <button
            type="button"
            onClick={() => { setTab('lyrics'); setSelectedResult(null); setShowCollectionPicker(false); setSaved(false) }}
            className="pb-1 transition-all"
            style={tabStyle(tab === 'lyrics')}
          >
            lyrics
          </button>
          <button
            type="button"
            onClick={() => { setTab('listen'); setSelectedResult(null); setShowCollectionPicker(false); setSaved(false) }}
            className="pb-1 transition-all"
            style={tabStyle(tab === 'listen')}
          >
            listen
          </button>
        </div>

        {/* Tab content */}
        {tab === 'lyrics' && (
          <LyricsTab onResultSelect={handleResultSelect} selectedResult={selectedResult} />
        )}
        {tab === 'listen' && (
          <ListenTab onResultSelect={handleResultSelect} selectedResult={selectedResult} />
        )}

        {/* Action buttons — show when a result is selected */}
        {selectedResult && !showCollectionPicker && (
          <div className="mt-6 space-y-2">
            {saved && (
              <div className="flex items-center justify-center gap-2 py-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-sm text-green-600">saved to collection</span>
              </div>
            )}
            {!saved && (
              <>
                <button
                  type="button"
                  onClick={handleSaveAsEarwyrm}
                  className="w-full py-3 text-center font-medium transition-all"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: '1.15rem',
                    backgroundColor: 'var(--text-primary, #2C2825)',
                    color: 'var(--surface-elevated, #F5F0E8)',
                    border: '2px solid var(--text-primary, #2C2825)',
                  }}
                >
                  save as your earwyrm
                </button>
                <button
                  type="button"
                  onClick={() => setShowCollectionPicker(true)}
                  className="w-full py-3 text-center transition-all"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: '1.15rem',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary, #2C2825)',
                    border: '2px solid var(--text-primary, #2C2825)',
                  }}
                >
                  add to collection
                </button>
              </>
            )}
          </div>
        )}

        {/* Collection picker */}
        {showCollectionPicker && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-charcoal/40">choose a collection</p>
              <button
                type="button"
                onClick={() => setShowCollectionPicker(false)}
                className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
              >
                back
              </button>
            </div>

            {creatingCollection ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="collection name"
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
                  style={{
                    border: '1px solid var(--border-subtle, rgba(0,0,0,0.1))',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNewCollection()
                    if (e.key === 'Escape') setCreatingCollection(false)
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateNewCollection}
                  className="px-3 py-2 text-sm"
                  style={{
                    backgroundColor: 'var(--text-primary, #2C2825)',
                    color: 'var(--surface-elevated, #F5F0E8)',
                  }}
                >
                  create
                </button>
              </div>
            ) : (
              <CollectionPicker
                onSelect={handleAddToCollection}
                onCreateNew={() => setCreatingCollection(true)}
              />
            )}

            {saving && (
              <p className="text-xs text-charcoal/30 text-center mt-3">saving...</p>
            )}
          </div>
        )}
      </div>
    </ModalSheet>
  )
}
