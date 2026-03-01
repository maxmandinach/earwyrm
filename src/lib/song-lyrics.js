/**
 * Song lyrics service — fetches and caches full lyrics via edge function.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Fetch full lyrics for a song. Returns plain_lyrics string or null.
 */
export async function fetchSongLyrics(songTitle, artistName) {
  if (!songTitle?.trim() || !artistName?.trim()) return null

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/song-lyrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        song_title: songTitle.trim(),
        artist_name: artistName.trim(),
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.plain_lyrics || null
  } catch (err) {
    console.error('Song lyrics fetch error:', err)
    return null
  }
}
