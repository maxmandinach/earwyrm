import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 Supabase Configuration Check:')
console.log('  URL:', supabaseUrl)
console.log('  Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...')
console.log('  URL is valid:', !!supabaseUrl && supabaseUrl.includes('supabase.co'))
console.log('  Key is valid:', !!supabaseAnonKey && supabaseAnonKey.length > 100)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-application-name': 'earworm'
      }
    }
  }
)

console.log('✅ Supabase client created')

// Test connection immediately with timeout
setTimeout(async () => {
  console.log('🧪 Testing Supabase connection...')

  // Test 1: Raw fetch to see if network works
  console.log('🧪 Test 1: Raw fetch to Supabase...')
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    console.log('🧪 Raw fetch succeeded!', response.status)
  } catch (err) {
    console.error('🧪 Raw fetch failed:', err.message)
  }

  // Test 2: Supabase client with timeout
  console.log('🧪 Test 2: Supabase client query...')
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.error('🧪 Supabase client query timed out after 5 seconds')
      controller.abort()
    }, 5000)

    const promise = supabase.from('profiles').select('count').limit(1)
    console.log('🧪 Query promise created:', promise)

    const { data, error } = await promise
    clearTimeout(timeoutId)

    console.log('🧪 Test result:', { data, error, success: !error })
    if (error) {
      console.error('🧪 Test failed:', error)
    } else {
      console.log('🧪 Supabase connection works!')
    }
  } catch (err) {
    console.error('🧪 Test exception:', err)
  }

  // Test 3: Check if the promise ever settles
  console.log('🧪 Test 3: Promise behavior test...')
  const testPromise = supabase.from('profiles').select('count').limit(1)
  console.log('🧪 Test promise:', testPromise)
  console.log('🧪 Test promise has then?', typeof testPromise.then === 'function')

  testPromise.then(result => {
    console.log('🧪 Test promise resolved:', result)
  }).catch(err => {
    console.error('🧪 Test promise rejected:', err)
  })
}, 2000)
