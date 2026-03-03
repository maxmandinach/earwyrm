/**
 * AI-generated card art — calls the generate-card-art Edge Function.
 * Requires Plus subscription.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Generate AI artwork for a lyric share card.
 * @param {Object} params
 * @param {string} params.lyricContent - The lyric text
 * @param {string} [params.noteContent] - User's note
 * @param {string} [params.songTitle] - Song title
 * @param {string} [params.artistName] - Artist name
 * @param {string[]} [params.tags] - User tags
 * @param {string} params.lyricId - Lyric UUID
 * @param {string} accessToken - User's Supabase access token
 * @returns {Promise<{image_url: string, remaining: number}>} The public URL of the generated image and remaining daily count
 */
export async function generateCardArt({ lyricContent, noteContent, songTitle, artistName, tags, lyricId }, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-card-art`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      lyric_content: lyricContent,
      note_content: noteContent || null,
      song_title: songTitle || null,
      artist_name: artistName || null,
      tags: tags || [],
      lyric_id: lyricId,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const error = new Error(err.error || `Card art generation failed (${res.status})`)
    if (err.upgrade) error.upgrade = true
    throw error
  }

  const data = await res.json()
  return data
}

/**
 * Create a Stripe Checkout session for web subscription.
 * @param {'monthly' | 'yearly'} plan
 * @param {string} accessToken
 * @returns {Promise<string>} Stripe Checkout URL
 */
export async function createCheckoutSession(plan, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      plan,
      success_url: `${window.location.origin}/settings?subscribed=true`,
      cancel_url: `${window.location.origin}/settings`,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Checkout creation failed (${res.status})`)
  }

  const data = await res.json()
  return data.url
}
