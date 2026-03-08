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
  refinement?: string
}

interface PromptContext {
  lyric_content: string
  note_content?: string
  song_title?: string
  artist_name?: string
  genres: string[]
  tags: string[]
  refinement?: string
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
    const token = authHeader.replace("Bearer ", "")

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // Check subscription tier
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single()

    const isPlus = profile?.subscription_tier === "plus"

    const body: CardArtRequest = await req.json()
    const { lyric_content, note_content, song_title, artist_name, tags, lyric_id, refinement } = body

    if (!lyric_content || !lyric_id) {
      return new Response(JSON.stringify({ error: "lyric_content and lyric_id are required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    let remaining: number
    let isFreeTier = false

    if (isPlus) {
      // Plus: 100 generations per calendar month
      const now = new Date()
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
      const { data: monthGens, error: rateError } = await supabaseAdmin
        .from("card_art_generations")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", monthStart)

      if (rateError) {
        console.error("Rate limit check error:", rateError)
      }

      const genCount = monthGens?.length || 0
      remaining = Math.max(0, 100 - genCount)

      if (genCount >= 100) {
        return new Response(JSON.stringify({ error: "Monthly limit reached (100/month)", remaining: 0 }), {
          status: 429,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        })
      }
    } else {
      // Free: 1 lifetime generation
      const { data: allGens, error: countError } = await supabaseAdmin
        .from("card_art_generations")
        .select("id")
        .eq("user_id", user.id)

      if (countError) {
        console.error("Free gen count check error:", countError)
      }

      if ((allGens?.length || 0) >= 1) {
        return new Response(JSON.stringify({ error: "Free generation used", upgrade: true }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        })
      }

      remaining = 0
      isFreeTier = true
    }

    // Step 1: MusicBrainz genre lookup (cached)
    let genreTags: string[] = []
    if (artist_name) {
      genreTags = await getArtistGenres(supabaseAdmin, artist_name)
    }

    // Step 2: Insert generation record first to get its ID (for storage path)
    const { data: genRecord, error: insertError } = await supabaseAdmin
      .from("card_art_generations")
      .insert({
        user_id: user.id,
        lyric_id: lyric_id,
        note_content: note_content || null,
        art_direction: refinement || null,
      })
      .select("id")
      .single()

    if (insertError || !genRecord) {
      throw new Error(`Failed to create generation record: ${insertError?.message}`)
    }

    const genId = genRecord.id

    // Step 3: Claude crafts the image prompt directly
    const prompt = await craftImagePrompt({
      lyric_content,
      note_content,
      song_title,
      artist_name,
      genres: genreTags,
      tags: tags || [],
      refinement,
    })

    console.log("Image prompt:", prompt)

    // Step 4: Generate image
    const imageData = await generateImage(prompt)

    // Step 5: Upload to Supabase Storage (per-variant path)
    const imageUrl = await uploadToStorage(supabaseAdmin, lyric_id, genId, imageData)

    // Step 6: Update generation record with image URL
    await supabaseAdmin
      .from("card_art_generations")
      .update({ image_url: imageUrl })
      .eq("id", genId)

    // Step 7: Set as active card art on the lyric
    await supabaseAdmin
      .from("lyrics")
      .update({ card_art_url: imageUrl })
      .eq("id", lyric_id)

    return new Response(JSON.stringify({ image_url: imageUrl, remaining: isPlus ? remaining - 1 : 0, is_free_gen: isFreeTier }), {
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

// --- Claude Haiku → Direct Image Prompt ---
//
// Instead of extracting JSON themes (fragile, lossy), Haiku writes the
// image prompt directly as prose. This eliminates JSON parse failures
// (which previously caused every failed extraction to produce the same
// generic dark image) and lets Haiku weave the note's emotion into
// concrete visual language naturally.

async function craftImagePrompt(ctx: PromptContext): Promise<string> {
  // Truncate lyric for copyright safety
  const truncatedLyric = ctx.lyric_content.length > 150
    ? ctx.lyric_content.slice(0, 150).replace(/\s+\S*$/, "…")
    : ctx.lyric_content

  const truncatedNote = ctx.note_content && ctx.note_content.length > 250
    ? ctx.note_content.slice(0, 250).replace(/\s+\S*$/, "…")
    : ctx.note_content

  const userMessage = [
    `Lyric: "${truncatedLyric}"`,
    truncatedNote ? `Personal note (why this lyric matters to me): "${truncatedNote}"` : null,
    ctx.song_title ? `Song: "${ctx.song_title}"` : null,
    ctx.artist_name ? `Artist: "${ctx.artist_name}"` : null,
    ctx.genres.length > 0 ? `Genre: ${ctx.genres.join(", ")}` : null,
    ctx.tags.length > 0 ? `Tags: ${ctx.tags.join(", ")}` : null,
    ctx.refinement ? `Art direction for this variation: "${ctx.refinement}"` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const systemPrompt = `You write image generation prompts for artwork inspired by song lyrics.

OUTPUT: A single paragraph (60-120 words) that is the complete image prompt. Nothing else — no preamble, no quotes, no labels.

YOUR PROCESS:
1. Identify the EMOTIONAL CORE. If a personal note is present, it IS the emotional core — it tells you what this lyric means to this specific person. The note should strongly influence the mood, palette, and subject matter.
2. Build a SCENE that captures that emotion. Use vivid, specific imagery — people, places, objects, nature, whatever fits. If the emotion is about human connection, show people connecting. If it's about solitude, show solitude. Let the content match the feeling.
3. Pull 1-2 specific images or phrases from the LYRIC TEXT as visual anchors.
4. Choose a COLOR PALETTE that matches the emotional tone.
5. Let the artist's genre influence the artistic style (e.g. impressionist, collage, oil painting, watercolor, digital illustration) but not the subject matter.

STYLE GUIDELINES:
- Aim for painterly, textured, warm artwork — not photorealistic, not sterile digital renders.
- When depicting people, favor impressionistic or slightly abstracted figures (seen from behind, soft focus, watercolor-style) over detailed faces.
- Two different lyrics by the same artist should produce completely different imagery.
- End the prompt with: "No text, letters, or words anywhere in the image."`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error("Claude API error:", res.status, errText)
    // Fall back to a direct prompt built from the inputs rather than generic imagery
    return buildFallbackPrompt(truncatedLyric, truncatedNote)
  }

  const data = await res.json()
  const text = (data.content?.[0]?.text || "").trim()

  if (!text || text.length < 20) {
    console.error("Claude returned empty/short response:", text)
    return buildFallbackPrompt(truncatedLyric, truncatedNote)
  }

  return text
}

// Fallback that still uses the actual inputs instead of hardcoded generic imagery
function buildFallbackPrompt(lyric: string, note?: string | null): string {
  if (note) {
    return `Textured abstract artwork. The feeling: ${note}. Inspired by: "${lyric}". Warm, layered, tactile. Mixed media collage style. No text, letters, or words. No human figures.`
  }
  return `Textured abstract artwork inspired by: "${lyric}". Rich color, layered textures, tactile surfaces. Mixed media collage style. No text, letters, or words. No human figures.`
}

// --- GPT Image Generation ---

async function generateImage(prompt: string): Promise<Uint8Array> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1.5",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Image generation error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error("No image data returned")

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
  genId: string,
  imageData: Uint8Array
): Promise<string> {
  const path = `${lyricId}/${genId}.png`

  const { error } = await supabase.storage
    .from("card-art")
    .upload(path, imageData, {
      contentType: "image/png",
      upsert: false,
    })

  if (error) throw new Error(`Storage upload error: ${error.message}`)

  const { data } = supabase.storage.from("card-art").getPublicUrl(path)
  return data.publicUrl
}
