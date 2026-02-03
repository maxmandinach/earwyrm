/**
 * Cleanup script: removes test data created by seed-test-duplicates.js
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanup-test-data.js
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanup() {
  const { data, error } = await supabase
    .from('lyrics')
    .delete()
    .eq('artist_name', 'Test Artist Alpha')
    .select()

  if (error) {
    console.error('Failed to clean up:', error.message)
  } else {
    console.log(`✓ Deleted ${data.length} test lyrics`)
  }
}

cleanup()
