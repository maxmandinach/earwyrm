import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const AUDD_API_TOKEN = Deno.env.get("AUDD_API_TOKEN")

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { audio } = await req.json()
    if (!audio) {
      return new Response(JSON.stringify({ result: null, error: "No audio data provided" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const formData = new FormData()
    formData.append("api_token", AUDD_API_TOKEN || "")
    formData.append("audio", audio)
    formData.append("return", "apple_music,spotify")

    const res = await fetch("https://api.audd.io/", {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      throw new Error(`audd.io API error: ${res.status}`)
    }

    const data = await res.json()

    if (data.status === "error") {
      throw new Error(data.error?.error_message || "Recognition failed")
    }

    if (!data.result) {
      return new Response(JSON.stringify({ result: null }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // Normalize result
    const result = {
      title: data.result.title || null,
      artist: data.result.artist || null,
      album: data.result.album || null,
      albumArt: data.result.spotify?.album?.images?.[0]?.url
        || data.result.apple_music?.artwork?.url?.replace("{w}", "300").replace("{h}", "300")
        || null,
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ result: null, error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})
