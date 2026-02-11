import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const GENIUS_TOKEN = Deno.env.get("GENIUS_ACCESS_TOKEN")

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { lyrics } = await req.json()
    if (!lyrics || lyrics.length < 5) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // Search Genius official API (searches across lyrics content)
    const url = `https://api.genius.com/search?q=${encodeURIComponent(lyrics)}&per_page=5`
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${GENIUS_TOKEN}`,
      },
    })

    if (!res.ok) {
      throw new Error(`Genius API error: ${res.status}`)
    }

    const data = await res.json()
    const hits = data.response?.hits || []

    const results = hits.map((hit: any) => ({
      title: hit.result?.title,
      artist: hit.result?.primary_artist?.name,
      albumArt: hit.result?.song_art_image_thumbnail_url,
      geniusUrl: hit.result?.url,
    }))

    return new Response(JSON.stringify({ results }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, results: [] }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})
