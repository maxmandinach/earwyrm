import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCollection } from '../contexts/CollectionContext'
import { useLyric } from '../contexts/LyricContext'
import { useAuth } from '../contexts/AuthContext'
import { themes } from '../lib/themes'
import NoteDisplay from '../components/NoteDisplay'
import { supabase } from '../lib/supabase-wrapper'

// Collection color mapping
const collectionColors = {
  charcoal: 'bg-charcoal',
  coral: 'bg-[#FF6B6B]',
  sage: 'bg-[#51B695]',
  lavender: 'bg-[#9B89B3]',
  amber: 'bg-[#F0A500]',
  ocean: 'bg-[#4A90E2]',
}

function LyricEntry({ lyric, note, onRemove, showRemove }) {
  const theme = themes[lyric.theme] || themes.default

  const cardStyle = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: '0.875rem',
    fontWeight: theme.fontWeight,
    lineHeight: '1.5',
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
  }

  const secondaryStyle = {
    color: theme.secondaryColor,
    fontFamily: theme.fontFamily,
  }

  // Format date
  const date = new Date(lyric.created_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="py-6 border-b border-charcoal/10 last:border-b-0 group">
      <div className="w-full p-4 mb-2" style={cardStyle}>
        <blockquote className="mb-2">
          {lyric.content}
        </blockquote>

        {(lyric.song_title || lyric.artist_name) && (
          <p className="text-xs mt-1.5" style={secondaryStyle}>
            {lyric.song_title && <span>{lyric.song_title}</span>}
            {lyric.song_title && lyric.artist_name && <span> — </span>}
            {lyric.artist_name && <span>{lyric.artist_name}</span>}
          </p>
        )}

        {/* Tags - if present */}
        {lyric.tags && lyric.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {lyric.tags.map((tag, index) => (
              <span key={index} className="text-xs opacity-60" style={secondaryStyle}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Note - displayed subtly outside the card */}
      {note && <NoteDisplay content={note.content} />}

      {/* Date and Remove button */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-charcoal-light/50">
          {formattedDate}
        </p>
        {showRemove && onRemove && (
          <button
            onClick={() => onRemove(lyric.id)}
            className="text-xs text-charcoal-light/40 hover:text-charcoal transition-colors opacity-0 group-hover:opacity-100"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

export default function CollectionDetail() {
  const { id } = useParams()
  const { collections, getLyricsInCollection, addLyricToCollection, removeLyricFromCollection } = useCollection()
  const { fetchNoteForLyric } = useLyric()
  const { user } = useAuth()
  const [collection, setCollection] = useState(null)
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAddLyrics, setShowAddLyrics] = useState(false)
  const [availableLyrics, setAvailableLyrics] = useState([])
  const [selectedLyrics, setSelectedLyrics] = useState([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)

  useEffect(() => {
    async function loadCollection() {
      setLoading(true)

      // Find the collection
      const foundCollection = collections.find(c => c.id === id)
      setCollection(foundCollection)

      if (!foundCollection) {
        setLoading(false)
        return
      }

      try {
        // Get lyrics in this collection
        const lyricsData = await getLyricsInCollection(id)

        // Sort by created_at descending (newest first)
        const sortedLyrics = [...lyricsData].sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        )

        setLyrics(sortedLyrics)

        // Fetch notes for all lyrics
        const notesData = {}
        for (const lyric of sortedLyrics) {
          try {
            const note = await fetchNoteForLyric(lyric.id)
            if (note) {
              notesData[lyric.id] = note
            }
          } catch (err) {
            console.error('Error fetching note:', err)
          }
        }
        setNotes(notesData)
      } catch (err) {
        console.error('Error loading collection:', err)
      } finally {
        setLoading(false)
      }
    }

    if (collections.length > 0) {
      loadCollection()
    }
  }, [id, collections, getLyricsInCollection, fetchNoteForLyric])

  async function fetchAvailableLyrics() {
    if (!collection || collection.is_smart) return

    setLoadingAvailable(true)
    try {
      // Fetch all user's lyrics
      const { data: allLyrics, error } = await supabase
        .from('lyrics')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      // Filter out lyrics already in this collection
      const lyricIdsInCollection = new Set(lyrics.map(l => l.id))
      const available = allLyrics?.filter(l => !lyricIdsInCollection.has(l.id)) || []

      // Sort by created_at descending
      const sorted = available.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setAvailableLyrics(sorted)
    } catch (err) {
      console.error('Error fetching available lyrics:', err)
    } finally {
      setLoadingAvailable(false)
    }
  }

  async function handleAddLyrics() {
    if (selectedLyrics.length === 0) return

    try {
      for (const lyricId of selectedLyrics) {
        await addLyricToCollection(lyricId, collection.id)
      }

      // Refresh the collection
      const lyricsData = await getLyricsInCollection(id)
      const sortedLyrics = [...lyricsData].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )
      setLyrics(sortedLyrics)

      // Close modal and reset
      setShowAddLyrics(false)
      setSelectedLyrics([])
      setAvailableLyrics([])
    } catch (err) {
      console.error('Error adding lyrics:', err)
      alert('Failed to add lyrics. Please try again.')
    }
  }

  async function handleRemoveLyric(lyricId) {
    if (!confirm('Remove this lyric from the collection?')) return

    try {
      await removeLyricFromCollection(lyricId, collection.id)

      // Update local state
      setLyrics(lyrics.filter(l => l.id !== lyricId))
    } catch (err) {
      console.error('Error removing lyric:', err)
      alert('Failed to remove lyric. Please try again.')
    }
  }

  function handleOpenAddLyrics() {
    setShowAddLyrics(true)
    fetchAvailableLyrics()
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-sm text-charcoal-light/60">Loading...</p>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-charcoal-light/60 mb-4">Collection not found</p>
        <Link to="/collections" className="text-sm text-charcoal hover:opacity-70 transition-opacity">
          ← Back to collections
        </Link>
      </div>
    )
  }

  const colorClass = collectionColors[collection.color] || collectionColors.charcoal

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Back link */}
      <Link
        to="/collections"
        className="inline-flex items-center text-sm text-charcoal-light hover:text-charcoal transition-colors mb-6"
      >
        ← Back to collections
      </Link>

      {/* Collection header */}
      <div className="mb-8">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full ${colorClass} flex-shrink-0 mt-2`} />
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-2xl font-medium text-charcoal">
                {collection.name}
              </h1>
              {!collection.is_smart && (
                <button
                  onClick={handleOpenAddLyrics}
                  className="text-xs text-charcoal-light hover:text-charcoal transition-colors"
                >
                  + Add lyrics
                </button>
              )}
            </div>
            {collection.description && (
              <p className="text-sm text-charcoal-light/70">
                {collection.description}
              </p>
            )}
          </div>
        </div>

        {collection.is_smart && (
          <div className="mt-4 p-3 bg-charcoal/5 border-l-2 border-charcoal/20">
            <p className="text-xs text-charcoal-light/70">
              Smart collection: Automatically includes lyrics tagged with <span className="font-medium">#{collection.smart_tag}</span>
            </p>
          </div>
        )}
      </div>

      {/* Lyrics list */}
      {lyrics.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-charcoal-light/60 mb-2">
            No lyrics in this collection yet
          </p>
          <p className="text-sm text-charcoal-light/50">
            {collection.is_smart
              ? `Tag lyrics with #${collection.smart_tag} to add them to this collection`
              : 'Click "+ Add lyrics" above to add lyrics to this collection'
            }
          </p>
        </div>
      ) : (
        <div>
          {lyrics.map((lyric) => (
            <LyricEntry
              key={lyric.id}
              lyric={lyric}
              note={notes[lyric.id]}
              onRemove={handleRemoveLyric}
              showRemove={!collection.is_smart}
            />
          ))}
        </div>
      )}

      {/* Add lyrics modal */}
      {showAddLyrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/20">
          <div className="bg-cream w-full max-w-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-charcoal/10 flex justify-between items-center">
              <h2 className="text-lg font-medium text-charcoal">Add lyrics to collection</h2>
              <button
                onClick={() => {
                  setShowAddLyrics(false)
                  setSelectedLyrics([])
                  setAvailableLyrics([])
                }}
                className="px-4 py-2 text-sm text-charcoal-light hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {loadingAvailable ? (
                <p className="text-sm text-charcoal-light/60">Loading lyrics...</p>
              ) : availableLyrics.length === 0 ? (
                <p className="text-sm text-charcoal-light/60">All your lyrics are already in this collection</p>
              ) : (
                <div className="space-y-4">
                  {availableLyrics.map((lyric) => {
                    const theme = themes[lyric.theme] || themes.default
                    const isSelected = selectedLyrics.includes(lyric.id)

                    return (
                      <label
                        key={lyric.id}
                        className={`block p-4 border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-charcoal/60 bg-charcoal/5'
                            : 'border-charcoal/10 hover:border-charcoal/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLyrics([...selectedLyrics, lyric.id])
                              } else {
                                setSelectedLyrics(selectedLyrics.filter(id => id !== lyric.id))
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-charcoal line-clamp-2">
                              {lyric.content}
                            </p>
                            {(lyric.song_title || lyric.artist_name) && (
                              <p className="text-xs text-charcoal-light/60 mt-1">
                                {lyric.song_title && <span>{lyric.song_title}</span>}
                                {lyric.song_title && lyric.artist_name && <span> — </span>}
                                {lyric.artist_name && <span>{lyric.artist_name}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-charcoal/10">
              <button
                onClick={handleAddLyrics}
                disabled={selectedLyrics.length === 0}
                className="w-full py-3 text-sm font-medium text-charcoal border border-charcoal/30 hover:border-charcoal/60
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add {selectedLyrics.length > 0 && `${selectedLyrics.length} `}
                {selectedLyrics.length === 1 ? 'lyric' : 'lyrics'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
