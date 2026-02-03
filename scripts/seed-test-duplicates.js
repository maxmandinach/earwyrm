/**
 * Seed script: creates test duplicate lyrics to verify clustering UI.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-test-duplicates.js
 *
 * Creates lyrics for a fake song "Test Song Alpha" by "Test Artist Alpha"
 * with 4 users saving the same lyric (should cluster as "saved by 4 people")
 * and 2 users saving a different lyric (should cluster as "saved by 2 people")
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Fake user IDs (valid UUIDs, won't match real users)
const fakeUsers = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
]

const testLyrics = [
  // Cluster 1: 4 people save the same lyric (with slight variations)
  { user_id: fakeUsers[0], content: "We're just two lost souls swimming in a fish bowl", song_title: "Test Song Alpha", artist_name: "Test Artist Alpha" },
  { user_id: fakeUsers[1], content: "We're just two lost souls swimming in a fish bowl", song_title: "Test Song Alpha", artist_name: "Test Artist Alpha" },
  { user_id: fakeUsers[2], content: "We're just two lost souls swimming in a fish bowl", song_title: "Test Song Alpha", artist_name: "Test Artist Alpha" },
  { user_id: fakeUsers[3], content: "We're just two lost souls swimming in a fish bowl", song_title: "Test Song Alpha", artist_name: "Test Artist Alpha" },

  // Cluster 2: 2 people save a different lyric
  { user_id: fakeUsers[4], content: "How I wish you were here", song_title: "Test Song Alpha", artist_name: "Test Artist Alpha" },
  { user_id: fakeUsers[5], content: "How I wish you were here", song_title: "Test Song Alpha", artist_name: "Test Artist Alpha" },

  // Another song by same artist (for "More from Artist" carousel)
  { user_id: fakeUsers[0], content: "All in all it was just a brick in the wall", song_title: "Test Song Beta", artist_name: "Test Artist Alpha" },
]

async function seed() {
  // First, clean up any previous test data
  const { error: deleteError } = await supabase
    .from('lyrics')
    .delete()
    .eq('artist_name', 'Test Artist Alpha')

  if (deleteError) {
    console.error('Failed to clean up:', deleteError.message)
  } else {
    console.log('Cleaned up previous test data')
  }

  // Insert test lyrics
  for (const lyric of testLyrics) {
    const { data, error } = await supabase
      .from('lyrics')
      .insert({
        ...lyric,
        is_public: true,
        is_current: false,
        theme: 'signature',
        tags: [],
      })
      .select()
      .single()

    if (error) {
      console.error(`Failed to insert: ${error.message}`)
    } else {
      console.log(`Inserted: "${lyric.content.substring(0, 40)}..." (${data.id})`)
    }
  }

  console.log('\n✓ Test data seeded!')
  console.log('\nNext steps:')
  console.log('1. Run backfill to link duplicates:')
  console.log('   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-canonical.js')
  console.log('\n2. Visit in browser:')
  console.log('   - Song page: /song/test%20song%20alpha')
  console.log('   - Artist page: /artist/test%20artist%20alpha')
  console.log('\n3. What to look for:')
  console.log('   - "Most saved line" section with "saved by 4 people"')
  console.log('   - Second cluster showing "2 people saved this"')
  console.log('   - "More from Test Artist Alpha" carousel on song page')
  console.log('\n4. Clean up when done:')
  console.log('   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanup-test-data.js')
}

seed()
