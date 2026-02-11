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
