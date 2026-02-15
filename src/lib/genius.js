/**
 * Genius lyrics search — identifies songs from lyric snippets.
 * Uses a Supabase Edge Function as a proxy (Genius blocks browser CORS).
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Search Genius for songs matching a lyric snippet.
 * Returns top matches with title, artist, and album art.
 */
export async function searchByLyrics(lyrics) {
  if (!lyrics || lyrics.trim().length < 10) return []

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/genius-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ lyrics: lyrics.trim() }),
    })

    if (!res.ok) return []

    const data = await res.json()
    return data.results || []
  } catch (err) {
    console.error('Genius search error:', err)
    return []
  }
}

/**
 * Search Genius for an artist image by artist name.
 * Returns the first result's artist image URL, or null.
 */
export async function searchArtistImage(artistName) {
  if (!artistName || artistName.trim().length < 2) return null

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/genius-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ lyrics: artistName.trim() }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const results = data.results || []
    if (results.length === 0) return null

    // Find first result whose artist name matches (case-insensitive)
    const match = results.find(r =>
      r.artist?.toLowerCase() === artistName.trim().toLowerCase()
    )
    return match?.artistImageUrl || results[0]?.artistImageUrl || null
  } catch (err) {
    console.error('Genius artist image search error:', err)
    return null
  }
}
