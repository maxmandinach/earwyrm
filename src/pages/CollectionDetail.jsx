import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCollection } from '../contexts/CollectionContext'
import { useAuth } from '../contexts/AuthContext'
import LyricCard from '../components/LyricCard'
import { supabase } from '../lib/supabase-wrapper'

export default function CollectionDetail() {
  const { id } = useParams()
  const { collections, getLyricsInCollection, addLyricToCollection, removeLyricFromCollection } = useCollection()
  const { user } = useAuth()
  const [collection, setCollection] = useState(null)
  const [lyrics, setLyrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddLyrics, setShowAddLyrics] = useState(false)
  const [availableLyrics, setAvailableLyrics] = useState([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)

  useEffect(() => {
    async function loadCollection() {
      setLoading(true)

      const foundCollection = collections.find(c => c.id === id)
      setCollection(foundCollection)

      if (!foundCollection) {
        setLoading(false)
        return
      }

      try {
        const lyricsData = await getLyricsInCollection(id)
        const sortedLyrics = [...lyricsData].sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        )
        setLyrics(sortedLyrics)
      } catch (err) {
        console.error('Error loading collection:', err)
      } finally {
        setLoading(false)
      }
    }

    if (collections.length > 0) {
      loadCollection()
    }
  }, [id, collections, getLyricsInCollection])

  async function fetchAvailableLyrics() {
    if (!collection || collection.is_smart) return

    setLoadingAvailable(true)
    try {
      const { data: allLyrics, error } = await supabase
        .from('lyrics')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      const lyricIdsInCollection = new Set(lyrics.map(l => l.id))
      const available = allLyrics?.filter(l => !lyricIdsInCollection.has(l.id)) || []
      const sorted = available.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setAvailableLyrics(sorted)
    } catch (err) {
      console.error('Error fetching available lyrics:', err)
    } finally {
      setLoadingAvailable(false)
    }
  }

  async function handleAddLyric(lyricId) {
    try {
      await addLyricToCollection(lyricId, collection.id)
      // Move from available to collection list
      const added = availableLyrics.find(l => l.id === lyricId)
      if (added) {
        setLyrics(prev => [added, ...prev])
        setAvailableLyrics(prev => prev.filter(l => l.id !== lyricId))
      }
    } catch (err) {
      console.error('Error adding lyric:', err)
    }
  }

  async function handleRemoveLyric(lyricId) {
    if (!confirm('Remove this lyric from the collection?')) return

    try {
      await removeLyricFromCollection(lyricId, collection.id)
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
      <div className="max-w-lg mx-auto px-4 py-12">
        <p className="text-sm text-charcoal/30">Loading...</p>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <p className="text-charcoal/40 mb-4">Collection not found</p>
        <Link to="/collections" className="text-sm text-charcoal/50 hover:text-charcoal transition-colors">
          ← back to collections
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Back link */}
      <Link
        to="/collections"
        className="inline-flex items-center text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors mb-6"
      >
        ← back to collections
      </Link>

      {/* Collection header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase">
            {collection.name}
          </h1>
          {!collection.is_smart && (
            <button
              onClick={handleOpenAddLyrics}
              className="text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors"
            >
              + add lyrics
            </button>
          )}
        </div>
        {collection.description && (
          <p className="text-sm text-charcoal/40">
            {collection.description}
          </p>
        )}
        {collection.is_smart && (
          <p className="text-xs text-charcoal/25 italic mt-2">
            auto-populated from #{collection.smart_tag}
          </p>
        )}
      </div>

      {/* Lyrics list */}
      {lyrics.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-charcoal/40 mb-2">
            No lyrics in this collection yet
          </p>
          <p className="text-sm text-charcoal/25">
            {collection.is_smart
              ? `Tag lyrics with #${collection.smart_tag} to add them here`
              : 'Tap "+ add lyrics" above, or save lyrics from anywhere in the app'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {lyrics.map((lyric) => (
            <div key={lyric.id} className="relative group">
              <LyricCard lyric={lyric} skipReveal />
              {!collection.is_smart && (
                <button
                  onClick={() => handleRemoveLyric(lyric.id)}
                  className="absolute top-3 right-3 text-xs text-charcoal/20 hover:text-charcoal/50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add lyrics modal — tap to add, no checkboxes */}
      {showAddLyrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/15">
          <div
            className="w-full max-w-md flex flex-col max-h-[80vh]"
            style={{
              backgroundColor: 'var(--surface-card, #F5F2ED)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
            }}
          >
            <div className="p-5 flex justify-between items-center"
              style={{ borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
            >
              <h2 className="text-sm text-charcoal/50 lowercase">add lyrics</h2>
              <button
                onClick={() => {
                  setShowAddLyrics(false)
                  setAvailableLyrics([])
                }}
                className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
              >
                done
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {loadingAvailable ? (
                <p className="text-xs text-charcoal/30 text-center py-8">loading...</p>
              ) : availableLyrics.length === 0 ? (
                <p className="text-xs text-charcoal/30 text-center py-8">all your lyrics are already here</p>
              ) : (
                <div className="space-y-3">
                  {availableLyrics.map((lyric) => (
                    <button
                      key={lyric.id}
                      onClick={() => handleAddLyric(lyric.id)}
                      className="w-full text-left p-4 transition-colors hover:bg-charcoal/5"
                      style={{
                        border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
                      }}
                    >
                      <p
                        className="text-sm text-charcoal/70 line-clamp-2 mb-1"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        {lyric.content}
                      </p>
                      {(lyric.song_title || lyric.artist_name) && (
                        <p className="text-xs text-charcoal/30 italic">
                          {lyric.song_title}
                          {lyric.song_title && lyric.artist_name && ' — '}
                          {lyric.artist_name}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
