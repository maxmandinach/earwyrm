/**
 * audd.io audio recognition — identifies songs from recorded audio.
 * Uses a Supabase Edge Function as a proxy to keep the API token server-side.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Send base64-encoded audio to audd.io for recognition.
 * Returns { title, artist, album, albumArt } or null if no match.
 */
export async function recognizeAudio(base64Audio) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/audd-recognize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ audio: base64Audio }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.result || null
  } catch (err) {
    console.error('Audio recognition error:', err)
    return null
  }
}
