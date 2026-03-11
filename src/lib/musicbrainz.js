/**
 * MusicBrainz API integration for song/artist metadata and cover art.
 *
 * Rate limit: 1 request/second (we debounce on the client side)
 * Docs: https://musicbrainz.org/doc/MusicBrainz_API
 */

const MB_BASE = 'https://musicbrainz.org/ws/2'
const CAA_BASE = 'https://coverartarchive.org'

// Ensure cover art URLs use HTTPS
function ensureHttps(url) {
  if (!url) return null
  return url.replace(/^http:\/\//i, 'https://')
}

// Browser-safe headers (can't set User-Agent from browser, it's a protected header)
const MB_HEADERS = {
  'Accept': 'application/json',
}

/**
 * Check if a release is a studio/official version (not live, compilation, etc.)
 */
function isStudioRelease(release) {
  if (!release) return false
  const rg = release['release-group'] || {}
  const secondaryTypes = rg['secondary-types'] || release['secondary-type-list'] || release['secondary-types'] || []
  const dominated = ['Live', 'Compilation', 'Remix', 'DJ-mix', 'Mixtape/Street', 'Demo', 'Bootleg']
  return !secondaryTypes.some(type => dominated.includes(type))
}

/**
 * Check if a recording title is junk (stage banter, crowd noise, etc.)
 */
function isJunkTitle(title) {
  if (!title) return true
  const t = title.trim()
  // Titles that are entirely bracketed like [banter], [crowd], [announcement]
  if (/^\[.*\]$/.test(t)) return true
  if (/^\(.*\)$/.test(t)) return true
  return false
}

/**
 * Check if a recording's disambiguation or ALL its releases indicate it's live.
 */
function isLiveRecording(rec) {
  // Check disambiguation field - most reliable signal from MusicBrainz
  // Live recordings have disambiguations like:
  //   "live, 2004-06-17: KeySpan Park, Brooklyn, NY, USA"
  //   "live bootleg, 1993-07-22: Stowe, VT"
  //   "1996-08-17: The Clifford Ball, Plattsburgh, NY, USA"
  const dis = rec.disambiguation || ''
  if (/\b(live|bootleg|concert)\b/i.test(dis)) return true
  // Date-location pattern in disambiguation (e.g. "1996-08-17: The Clifford Ball")
  if (/\d{4}-\d{2}-\d{2}:/.test(dis)) return true

  // Check if title itself says live
  if (/\b(live at|live in|live from|live:)\b/i.test(rec.title)) return true

  // Check releases - if ALL releases are live/compilation/etc, it's a live recording
  const releases = rec.releases || []
  if (releases.length > 0) {
    const hasStudio = releases.some(isStudioRelease)
    if (!hasStudio) return true
  }

  return false
}

/**
 * Check if a release title looks like a live show (date: venue pattern).
 */
function isLiveShowTitle(title) {
  if (!title) return false
  // "2004-06-17: KeySpan Park, Brooklyn, NY" or "1998-11-02: The 'E' Center"
  return /\d{4}[-‐‑–]\d{2}[-‐‑–]\d{2}/.test(title)
}

/**
 * Find the best release for a recording (prefer studio albums, deprioritize live shows).
 */
function findBestRelease(releases) {
  if (!releases || releases.length === 0) return null

  // First: studio release with a non-live-show title
  const studioNonLive = releases.find(r => isStudioRelease(r) && !isLiveShowTitle(r.title))
  if (studioNonLive) return studioNonLive

  // Second: any studio release
  const studio = releases.find(isStudioRelease)
  if (studio) return studio

  // Third: any release with a non-live-show title
  const nonLive = releases.find(r => !isLiveShowTitle(r.title))
  if (nonLive) return nonLive

  return releases[0]
}

/**
 * Score a recording title's relevance to the search query.
 * Higher = better match. Penalizes remixes, instrumentals, etc.
 */
function titleRelevanceScore(title, query) {
  const t = title.toLowerCase().trim()
  const q = query.toLowerCase().trim()

  // Exact match (best)
  if (t === q) return 100

  // Title without parenthetical suffix matches query
  const base = t.replace(/\s*\(.*\)\s*$/, '').trim()
  if (base === q) return 90

  // Query is a prefix of the base title
  if (base.startsWith(q)) return 80

  // Penalize variants
  if (/\b(instrumental)\b/i.test(title)) return 30
  if (/\b(remix|remixed|mix)\b/i.test(title)) return 20
  if (/\b(karaoke|tribute|cover)\b/i.test(title)) return 10
  if (/\b(radio edit|edit)\b/i.test(title)) return 60
  if (/\b(acoustic|unplugged)\b/i.test(title)) return 50

  return 70
}

/**
 * Deduplicate and rank recordings: filter junk, prefer studio, dedupe by title,
 * and rank by relevance to the search query.
 */
function dedupeAndRankRecordings(recordings, limit = 8, query = '') {
  // Filter out junk
  const clean = recordings.filter(r => !isJunkTitle(r.title))

  // Group by base title (strip parenthetical suffixes for grouping)
  const groups = new Map()
  for (const rec of clean) {
    const key = rec.title.toLowerCase().trim().replace(/\s*\(.*\)\s*$/, '').trim()
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(rec)
  }

  // For each unique base title, pick the best recording
  const best = []
  for (const [, recs] of groups) {
    // Sort within group: studio first, then relevance to query, then score
    recs.sort((a, b) => {
      const aStudio = !isLiveRecording(a) ? 1 : 0
      const bStudio = !isLiveRecording(b) ? 1 : 0
      if (bStudio !== aStudio) return bStudio - aStudio

      if (query) {
        const aRelevance = titleRelevanceScore(a.title, query)
        const bRelevance = titleRelevanceScore(b.title, query)
        if (bRelevance !== aRelevance) return bRelevance - aRelevance
      }

      return (b.score || 0) - (a.score || 0)
    })
    best.push(recs[0])
  }

  // Sort final results: studio first, then relevance, then score
  best.sort((a, b) => {
    const aStudio = !isLiveRecording(a) ? 1 : 0
    const bStudio = !isLiveRecording(b) ? 1 : 0
    if (bStudio !== aStudio) return bStudio - aStudio

    if (query) {
      const aRelevance = titleRelevanceScore(a.title, query)
      const bRelevance = titleRelevanceScore(b.title, query)
      if (bRelevance !== aRelevance) return bRelevance - aRelevance
    }

    return (b.score || 0) - (a.score || 0)
  })

  return best.slice(0, limit)
}

/**
 * Search for artists by name.
 */
export async function searchArtists(query, limit = 5) {
  if (!query || query.length < 2) return []

  const url = `${MB_BASE}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`

  try {
    const res = await fetch(url, { headers: MB_HEADERS })

    if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)

    const data = await res.json()

    return (data.artists || []).map(artist => ({
      id: artist.id,
      name: artist.name,
      type: artist.type || null,
      country: artist.country || null,
      disambiguation: artist.disambiguation || null, // e.g. "UK rock band"
      score: artist.score,
    }))
  } catch (err) {
    console.error('MusicBrainz artist search error:', err)
    return []
  }
}

/**
 * Search for recordings (songs) by artist and/or title.
 * Returns top matches with artist, song, album, and release ID for cover art.
 */
export async function searchRecordings(query, limit = 5) {
  if (!query || query.length < 2) return []

  const url = `${MB_BASE}/recording?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`

  try {
    const res = await fetch(url, { headers: MB_HEADERS })

    if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)

    const data = await res.json()

    return (data.recordings || []).map(rec => {
      const artist = rec['artist-credit']?.[0]?.name || null
      const release = rec.releases?.[0] || null

      return {
        id: rec.id,
        title: rec.title,
        artist: artist,
        album: release?.title || null,
        releaseId: release?.id || null,
        releaseGroupId: release?.['release-group']?.id || null,
        year: release?.date?.substring(0, 4) || null,
        score: rec.score,
      }
    })
  } catch (err) {
    console.error('MusicBrainz search error:', err)
    return []
  }
}

/**
 * Search specifically by artist name and song title (more precise).
 */
export async function searchByArtistAndSong(artist, song, limit = 5) {
  if (!artist && !song) return []

  let query = ''
  if (artist) query += `artist:"${artist}"`
  if (artist && song) query += ' AND '
  if (song) query += `recording:"${song}"`

  return searchRecordings(query, limit)
}


/**
 * Map a result recording to our clean format.
 */
function mapRecording(rec) {
  const artist = rec['artist-credit']?.[0]?.name || null
  const bestRelease = findBestRelease(rec.releases)

  return {
    id: rec.id,
    title: rec.title,
    artist: artist,
    album: bestRelease?.title || null,
    releaseId: bestRelease?.id || null,
    releaseGroupId: bestRelease?.['release-group']?.id || null,
    year: bestRelease?.date?.substring(0, 4) || null,
    score: rec.score,
  }
}

/**
 * Search recordings by artist MBID (most precise).
 * Fires two parallel searches: one excluding live releases (to surface studio versions
 * for artists like Phish with thousands of live recordings), and one broad.
 * Falls back to fuzzy search if both return no results (typo tolerance).
 */
export async function searchRecordingsByArtistId(artistId, songQuery, limit = 8) {
  if (!artistId || !songQuery || songQuery.length < 2) return []

  const baseQuery = `arid:${artistId} AND recording:"${songQuery}"`

  try {
    // Two parallel searches: filtered (no live) + broad
    const filteredUrl = `${MB_BASE}/recording?query=${encodeURIComponent(baseQuery + ' NOT secondarytype:live')}&fmt=json&limit=15`
    const broadUrl = `${MB_BASE}/recording?query=${encodeURIComponent(baseQuery)}&fmt=json&limit=15`

    const [filteredRes, broadRes] = await Promise.all([
      fetch(filteredUrl, { headers: MB_HEADERS }),
      fetch(broadUrl, { headers: MB_HEADERS }),
    ])

    let allRecordings = []
    const seenIds = new Set()

    // Add filtered results first
    if (filteredRes.ok) {
      for (const rec of ((await filteredRes.json()).recordings || [])) {
        allRecordings.push(rec)
        seenIds.add(rec.id)
      }
    }

    // Add broad results that aren't duplicates
    if (broadRes.ok) {
      for (const rec of ((await broadRes.json()).recordings || [])) {
        if (!seenIds.has(rec.id)) {
          allRecordings.push(rec)
          seenIds.add(rec.id)
        }
      }
    }

    // If no results at all, try fuzzy search (handles typos like "bue" -> "bye")
    if (allRecordings.length === 0) {
      const fuzzyQuery = `arid:${artistId} AND recording:${songQuery}~`
      const fuzzyUrl = `${MB_BASE}/recording?query=${encodeURIComponent(fuzzyQuery)}&fmt=json&limit=15`
      const fuzzyRes = await fetch(fuzzyUrl, { headers: MB_HEADERS })
      if (fuzzyRes.ok) {
        allRecordings = (await fuzzyRes.json()).recordings || []
      }
    }

    // Deduplicate and rank (studio > live, exact match > remix, filter junk)
    const ranked = dedupeAndRankRecordings(allRecordings, limit, songQuery)
    return ranked.map(mapRecording)
  } catch (err) {
    console.error('MusicBrainz search by artist ID error:', err)
    return []
  }
}

/**
 * Get cover art for a single recording (call on selection, not during search).
 */
export async function getCoverArtForRecording(recording) {
  if (!recording) return null

  let coverUrl = await getCoverArtByReleaseGroup(recording.releaseGroupId)
  if (!coverUrl) {
    coverUrl = await getCoverArt(recording.releaseId)
  }
  return coverUrl
}

/**
 * Search by artist/song and get cover art in one call.
 */
export async function searchByArtistAndSongWithCoverArt(artist, song, limit = 5) {
  const results = await searchByArtistAndSong(artist, song, limit)

  // Get cover art for first few results
  const withArt = await Promise.all(
    results.slice(0, 3).map(async (result) => {
      let coverUrl = await getCoverArtByReleaseGroup(result.releaseGroupId)
      if (!coverUrl) {
        coverUrl = await getCoverArt(result.releaseId)
      }
      return { ...result, coverArtUrl: coverUrl }
    })
  )

  const remaining = results.slice(3).map(r => ({ ...r, coverArtUrl: null }))
  return [...withArt, ...remaining]
}

/**
 * Get cover art URL for a release.
 * Returns the front cover in 250px size, or null if not available.
 */
export async function getCoverArt(releaseId) {
  if (!releaseId) return null

  try {
    const res = await fetch(`${CAA_BASE}/release/${releaseId}`, { headers: MB_HEADERS })

    if (!res.ok) return null

    const data = await res.json()
    const front = data.images?.find(img => img.front)

    const url = front?.thumbnails?.['250'] || front?.thumbnails?.small || null
    return ensureHttps(url)
  } catch {
    // Cover art not available is common, don't log as error
    return null
  }
}

/**
 * Get cover art by release group ID (more reliable - album level).
 */
export async function getCoverArtByReleaseGroup(releaseGroupId) {
  if (!releaseGroupId) return null

  try {
    const res = await fetch(`${CAA_BASE}/release-group/${releaseGroupId}`, { headers: MB_HEADERS })

    if (!res.ok) return null

    const data = await res.json()
    const front = data.images?.find(img => img.front)

    const url = front?.thumbnails?.['250'] || front?.thumbnails?.small || null
    return ensureHttps(url)
  } catch {
    return null
  }
}

/**
 * Search and get cover art in one call.
 * Returns array of results with cover art URLs resolved.
 */
export async function searchWithCoverArt(query, limit = 5) {
  const results = await searchRecordings(query, limit)

  // Get cover art for first few results (don't hammer the API)
  const withArt = await Promise.all(
    results.slice(0, 3).map(async (result) => {
      // Try release group first (more reliable), then release
      let coverUrl = await getCoverArtByReleaseGroup(result.releaseGroupId)
      if (!coverUrl) {
        coverUrl = await getCoverArt(result.releaseId)
      }
      return { ...result, coverArtUrl: coverUrl }
    })
  )

  // Add remaining results without cover art
  const remaining = results.slice(3).map(r => ({ ...r, coverArtUrl: null }))

  return [...withArt, ...remaining]
}
