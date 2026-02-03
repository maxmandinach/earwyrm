/**
 * One-time backfill script: link existing lyrics by canonical_lyric_id
 * where content matches (exact or substring) for the same song.
 *
 * Usage: node scripts/backfill-canonical.js
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function normalizeLyricText(text) {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[\u2026]/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
}

async function backfill() {
  // Fetch all public lyrics with song titles, no canonical_lyric_id
  let allLyrics = []
  let from = 0
  const batchSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('lyrics')
      .select('id, content, song_title, reaction_count, canonical_lyric_id')
      .eq('is_public', true)
      .not('song_title', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + batchSize - 1)

    if (error) { console.error(error); break }
    if (!data || data.length === 0) break
    allLyrics = allLyrics.concat(data)
    if (data.length < batchSize) break
    from += batchSize
  }

  console.log(`Fetched ${allLyrics.length} lyrics`)

  // Group by normalized song_title
  const bySong = {}
  for (const l of allLyrics) {
    const key = l.song_title.toLowerCase().trim()
    if (!bySong[key]) bySong[key] = []
    bySong[key].push(l)
  }

  let updates = 0

  for (const [song, group] of Object.entries(bySong)) {
    if (group.length < 2) continue

    // For each lyric without a canonical_lyric_id, try to find a match
    for (const lyric of group) {
      if (lyric.canonical_lyric_id) continue

      const normalizedNew = normalizeLyricText(lyric.content)
      let bestMatch = null
      let bestScore = -1

      for (const other of group) {
        if (other.id === lyric.id) continue
        const normalizedOther = normalizeLyricText(other.content)

        let score = -1
        if (normalizedNew === normalizedOther) {
          score = 2
        } else if (normalizedNew.includes(normalizedOther) || normalizedOther.includes(normalizedNew)) {
          score = 1
        }

        if (score > bestScore || (score === bestScore && (other.reaction_count || 0) > (bestMatch?.reaction_count || 0))) {
          if (score > 0) {
            bestMatch = other
            bestScore = score
          }
        }
      }

      if (bestMatch) {
        const canonicalId = bestMatch.canonical_lyric_id || bestMatch.id
        const { error } = await supabase
          .from('lyrics')
          .update({ canonical_lyric_id: canonicalId })
          .eq('id', lyric.id)

        if (error) {
          console.error(`Failed to update ${lyric.id}:`, error.message)
        } else {
          updates++
          console.log(`Linked ${lyric.id} → ${canonicalId} (song: "${song}")`)
        }
      }
    }
  }

  console.log(`Done. Updated ${updates} lyrics.`)
}

backfill()
