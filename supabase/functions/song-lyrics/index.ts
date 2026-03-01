import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const CACHE_TTL_DAYS = 30

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { song_title, artist_name } = await req.json()
    if (!song_title || !artist_name) {
      return new Response(
        JSON.stringify({ error: "song_title and artist_name required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    const normalizedTitle = song_title.trim().toLowerCase()
    const normalizedArtist = artist_name.trim().toLowerCase()

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Check cache
    const { data: cached } = await supabase
      .from("song_lyrics")
      .select("plain_lyrics, source, fetched_at")
      .eq("song_title", normalizedTitle)
      .eq("artist_name", normalizedArtist)
      .single()

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime()
      const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
      if (age < ttlMs) {
        return new Response(
          JSON.stringify({ plain_lyrics: cached.plain_lyrics, source: cached.source, cached: true }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        )
      }
    }

    // Fetch from LRCLIB
    const params = new URLSearchParams({
      artist_name: artist_name.trim(),
      track_name: song_title.trim(),
    })
    const lrcRes = await fetch(`https://lrclib.net/api/get?${params}`)

    let plainLyrics: string | null = null
    if (lrcRes.ok) {
      const lrcData = await lrcRes.json()
      plainLyrics = lrcData.plainLyrics || null
    }

    // Upsert into cache
    await supabase
      .from("song_lyrics")
      .upsert(
        {
          song_title: normalizedTitle,
          artist_name: normalizedArtist,
          plain_lyrics: plainLyrics,
          source: "lrclib",
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "song_title,artist_name" }
      )

    return new Response(
      JSON.stringify({ plain_lyrics: plainLyrics, source: "lrclib", cached: false }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, plain_lyrics: null }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  }
})
