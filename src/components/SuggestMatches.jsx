import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase-wrapper'

/**
 * Auto-suggests existing public lyrics as user types content or song title.
 * Fires parallel queries on content + song_title, merges and dedupes.
 * onSelect receives { id, content, artistName, songTitle } or null.
 */
export default function SuggestMatches({ songTitle, content, onSelect }) {
  const [matches, setMatches] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const debounceRef = useRef(null)
  const lastQueryRef = useRef('')

  const trimmedTitle = (songTitle || '').trim()
  const trimmedContent = (content || '').trim()
  const hasTitle = trimmedTitle.length >= 3
  const hasContent = trimmedContent.length >= 3
  const queryKey = `${trimmedContent}|${trimmedTitle}`

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!hasTitle && !hasContent) {
      setMatches([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      // Skip if query hasn't changed (e.g. whitespace-only diff)
      if (queryKey === lastQueryRef.current) return
      lastQueryRef.current = queryKey

      try {
        const queries = []

        if (hasContent) {
          const snippet = trimmedContent.slice(0, 60)
          queries.push(
            supabase
              .from('lyrics')
              .select('id, content, artist_name, song_title')
              .eq('is_public', true)
              .ilike('content', `%${snippet}%`)
              .order('reaction_count', { ascending: false })
              .limit(5)
          )
        }

        if (hasTitle) {
          queries.push(
            supabase
              .from('lyrics')
              .select('id, content, artist_name, song_title')
              .eq('is_public', true)
              .ilike('song_title', `%${trimmedTitle}%`)
              .order('reaction_count', { ascending: false })
              .limit(5)
          )
        }

        const results = await Promise.all(queries)
        const seen = new Set()
        const merged = []
        for (const { data } of results) {
          for (const row of data || []) {
            if (!seen.has(row.id)) {
              seen.add(row.id)
              merged.push(row)
            }
          }
        }

        setMatches(merged.slice(0, 5))
      } catch (err) {
        console.error('Error fetching matches:', err)
      }
    }, 150)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [queryKey])

  // Reset selection when inputs change — only notify parent if something was selected
  useEffect(() => {
    setSelectedId((prev) => {
      if (prev !== null) onSelect?.(null)
      return null
    })
  }, [queryKey])

  if (matches.length === 0) return null

  return (
    <div className="mt-4 mb-1 p-3 rounded bg-charcoal/[0.03] border border-charcoal/8">
      <p className="text-xs text-charcoal/45 mb-2" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        Someone already saved this one — tap to use it:
      </p>
      <div className="space-y-2">
        {matches.map((match) => (
          <button
            key={match.id}
            type="button"
            onClick={() => {
              if (selectedId === match.id) {
                setSelectedId(null)
                onSelect?.(null)
              } else {
                setSelectedId(match.id)
                onSelect?.({ id: match.id, content: match.content, artistName: match.artist_name, songTitle: match.song_title })
              }
            }}
            className={`w-full text-left px-3 py-2.5 border rounded transition-colors ${
              selectedId === match.id
                ? 'border-charcoal/30 bg-charcoal/8'
                : 'border-charcoal/10 bg-transparent hover:border-charcoal/20'
            }`}
          >
            <p
              className="text-charcoal/60 leading-snug line-clamp-2"
              style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
            >
              {match.content.length > 80 ? match.content.slice(0, 80) + '...' : match.content}
            </p>
            {match.song_title && (
              <p className="text-xs text-charcoal/30 mt-0.5" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {match.song_title}{match.artist_name ? ` — ${match.artist_name}` : ''}
              </p>
            )}
            {selectedId === match.id && (
              <p className="text-xs text-charcoal/50 mt-1.5 font-medium" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                Lyric + details will be filled in for you
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
