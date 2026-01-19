import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCollection } from '../contexts/CollectionContext'
import { useLyric } from '../contexts/LyricContext'
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

function LyricEntry({ lyric, note }) {
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
    <div className="py-6 border-b border-charcoal/10 last:border-b-0">
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

      {/* Date */}
      <p className="text-xs text-charcoal-light/50 mt-2">
        {formattedDate}
      </p>
    </div>
  )
}

export default function CollectionDetail() {
  const { id } = useParams()
  const { collections, getLyricsInCollection } = useCollection()
  const { fetchNoteForLyric } = useLyric()
  const [collection, setCollection] = useState(null)
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)

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
            <h1 className="text-2xl font-medium text-charcoal mb-2">
              {collection.name}
            </h1>
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
              : 'Add lyrics to this collection from the edit menu'
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
