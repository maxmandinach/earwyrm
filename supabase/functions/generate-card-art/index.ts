import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!

const GENRE_CACHE_TTL_DAYS = 90
const MUSICBRAINZ_USER_AGENT = "Earwyrm/1.0 (support@earwyrm.app)"

interface CardArtRequest {
  lyric_content: string
  note_content?: string
  song_title?: string
  artist_name?: string
  tags?: string[]
  lyric_id: string
}

interface ThemeExtraction {
  mood: string
  visual_imagery: string[]
  color_palette: string[]
  artistic_style: string[]
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const supabaseUser = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""), {
      global: { headers: { Authorization: authHeader } },
    })

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // Check Plus subscription
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single()

    if (profile?.subscription_tier !== "plus") {
      return new Response(JSON.stringify({ error: "Plus subscription required" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const body: CardArtRequest = await req.json()
    const { lyric_content, note_content, song_title, artist_name, tags, lyric_id } = body

    if (!lyric_content || !lyric_id) {
      return new Response(JSON.stringify({ error: "lyric_content and lyric_id are required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // Step 1: MusicBrainz genre lookup (cached)
    let genreTags: string[] = []
    if (artist_name) {
      genreTags = await getArtistGenres(supabaseAdmin, artist_name)
    }

    // Step 2: Claude Haiku theme extraction
    const themes = await extractThemes({
      lyric_content,
      note_content,
      genres: genreTags,
      tags: tags || [],
    })

    // Step 3: Construct DALL-E prompt
    const prompt = buildDallePrompt(themes)

    // Step 4: Generate image with DALL-E 3
    const imageData = await generateImage(prompt)

    // Step 5: Upload to Supabase Storage
    const imageUrl = await uploadToStorage(supabaseAdmin, lyric_id, imageData)

    return new Response(JSON.stringify({ image_url: imageUrl }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("generate-card-art error:", err)
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})

// --- MusicBrainz Genre Lookup (cached) ---

async function getArtistGenres(supabase: any, artistName: string): Promise<string[]> {
  const normalized = artistName.toLowerCase().trim()

  // Check cache
  const { data: cached } = await supabase
    .from("artist_genre_cache")
    .select("tags, fetched_at")
    .eq("artist_name", normalized)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    const ttl = GENRE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
    if (age < ttl) {
      return cached.tags || []
    }
  }

  // Fetch from MusicBrainz
  try {
    const searchUrl = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(artistName)}&fmt=json&limit=1`
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": MUSICBRAINZ_USER_AGENT },
    })

    if (!searchRes.ok) return cached?.tags || []

    const searchData = await searchRes.json()
    const artist = searchData.artists?.[0]
    if (!artist) return cached?.tags || []

    // Rate limit: wait 1s before next request
    await new Promise((r) => setTimeout(r, 1100))

    const tagsUrl = `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=tags&fmt=json`
    const tagsRes = await fetch(tagsUrl, {
      headers: { "User-Agent": MUSICBRAINZ_USER_AGENT },
    })

    if (!tagsRes.ok) return cached?.tags || []

    const tagsData = await tagsRes.json()
    const mbTags = (tagsData.tags || [])
      .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      .slice(0, 8)
      .map((t: any) => t.name)

    // Upsert cache
    await supabase
      .from("artist_genre_cache")
      .upsert({
        artist_name: normalized,
        mbid: artist.id,
        tags: mbTags,
        fetched_at: new Date().toISOString(),
      })

    return mbTags
  } catch (err) {
    console.error("MusicBrainz lookup error:", err)
    return cached?.tags || []
  }
}

// --- Claude Haiku Theme Extraction ---

async function extractThemes(input: {
  lyric_content: string
  note_content?: string
  genres: string[]
  tags: string[]
}): Promise<ThemeExtraction> {
  const userMessage = [
    `Lyric: "${input.lyric_content}"`,
    input.note_content ? `Note: "${input.note_content}"` : null,
    input.genres.length > 0 ? `Genre: ${input.genres.join(", ")}` : null,
    input.tags.length > 0 ? `Tags: ${input.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:
        "You extract visual themes from song lyrics for abstract artwork generation. Given a lyric, personal note, genre, and tags, output ONLY valid JSON with these keys: mood (2-3 words), visual_imagery (3-5 abstract visual concepts as array), color_palette (3-4 colors as descriptive words, not hex, as array), artistic_style (2-3 style descriptors as array). No markdown, no explanation, just JSON.",
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || "{}"

  try {
    return JSON.parse(text) as ThemeExtraction
  } catch {
    // Fallback if parsing fails
    return {
      mood: "contemplative, atmospheric",
      visual_imagery: ["flowing water", "soft light", "distant horizon"],
      color_palette: ["warm amber", "soft grey", "muted blue"],
      artistic_style: ["abstract", "impressionist"],
    }
  }
}

// --- DALL-E Prompt Construction ---

function buildDallePrompt(themes: ThemeExtraction): string {
  const parts = [
    "Abstract atmospheric artwork.",
    `Mood: ${themes.mood}.`,
    `Visual themes: ${themes.visual_imagery.join(", ")}.`,
    `Color palette: ${themes.color_palette.join(", ")}, with undertones of warm taupe.`,
    `Style: ${themes.artistic_style.join(", ")}, warm, softly textured, minimal, slightly analog, like a faded watercolor on aged paper.`,
    "No text, words, letters, numbers, or human figures.",
  ]
  return parts.join(" ")
}

// --- DALL-E 3 Image Generation ---

async function generateImage(prompt: string): Promise<Uint8Array> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`DALL-E API error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error("No image data returned from DALL-E")

  // Decode base64 to Uint8Array
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// --- Upload to Supabase Storage ---

async function uploadToStorage(
  supabase: any,
  lyricId: string,
  imageData: Uint8Array
): Promise<string> {
  const path = `${lyricId}.png`

  const { error } = await supabase.storage
    .from("card-art")
    .upload(path, imageData, {
      contentType: "image/png",
      upsert: true,
    })

  if (error) throw new Error(`Storage upload error: ${error.message}`)

  const { data } = supabase.storage.from("card-art").getPublicUrl(path)
  return data.publicUrl
}
