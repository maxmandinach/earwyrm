/**
 * MusicBrainz API integration for song/artist metadata and cover art.
 *
 * Rate limit: 1 request/second (we debounce on the client side)
 * Docs: https://musicbrainz.org/doc/MusicBrainz_API
 */

const MB_BASE = 'https://musicbrainz.org/ws/2'
const CAA_BASE = 'https://coverartarchive.org'
const USER_AGENT = 'Earwyrm/1.0 (https://earwyrm.app)'

/**
 * Search for recordings (songs) by artist and/or title.
 * Returns top matches with artist, song, album, and release ID for cover art.
 */
export async function searchRecordings(query, limit = 5) {
  if (!query || query.length < 2) return []

  const url = `${MB_BASE}/recording?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT }
    })

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
    const res = await fetch(`${CAA_BASE}/release/${releaseId}`, {
      headers: { 'User-Agent': USER_AGENT }
    })

    if (!res.ok) return null

    const data = await res.json()
    const front = data.images?.find(img => img.front)

    return front?.thumbnails?.['250'] || front?.thumbnails?.small || null
  } catch (err) {
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
    const res = await fetch(`${CAA_BASE}/release-group/${releaseGroupId}`, {
      headers: { 'User-Agent': USER_AGENT }
    })

    if (!res.ok) return null

    const data = await res.json()
    const front = data.images?.find(img => img.front)

    return front?.thumbnails?.['250'] || front?.thumbnails?.small || null
  } catch (err) {
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
