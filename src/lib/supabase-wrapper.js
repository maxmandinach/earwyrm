// Custom Supabase wrapper using raw fetch to bypass React 19 compatibility issues
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Custom Supabase wrapper - bypasses React 19 incompatibility in @supabase/supabase-js

// Original Supabase client for auth only (auth works fine)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Store session token in memory to avoid calling getSession()
let cachedAccessToken = null

// Listen to auth state changes to cache the token
supabaseAuth.auth.onAuthStateChange((event, session) => {
  cachedAccessToken = session?.access_token || null
})

// Custom fetch-based wrapper for database queries
async function dbQuery(table, { select, insert, update, eq, single, limit } = {}) {
  const headers = {
    'apikey': supabaseAnonKey,
    'Authorization': cachedAccessToken ? `Bearer ${cachedAccessToken}` : `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
    'Prefer': single ? 'return=representation' : 'return=representation'
  }

  let url = `${supabaseUrl}/rest/v1/${table}`
  let method = 'GET'
  let body = null

  // Build query based on operation
  if (select) {
    const params = new URLSearchParams()
    params.append('select', select)
    if (eq) {
      for (const [key, value] of Object.entries(eq)) {
        params.append(key, `eq.${value}`)
      }
    }
    if (limit) {
      params.append('limit', limit)
    }
    if (single) {
      headers['Accept'] = 'application/vnd.pgrst.object+json'
    }
    url += `?${params.toString()}`
  } else if (insert) {
    method = 'POST'
    body = JSON.stringify(insert)
  } else if (update) {
    method = 'PATCH'
    body = JSON.stringify(update.data)
    if (update.eq) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(update.eq)) {
        params.append(key, `eq.${value}`)
      }
      url += `?${params.toString()}`
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body
    })

    if (!response.ok) {
      const error = await response.json()
      return { data: null, error }
    }

    let data = await response.json()

    // If single was requested and we got an array, unwrap it
    if (single && Array.isArray(data) && data.length === 1) {
      data = data[0]
    }

    return { data, error: null }
  } catch (err) {
    console.error('Database query error:', err)
    return { data: null, error: err }
  }
}

// Wrapper object that mimics Supabase client API
export const supabase = {
  auth: supabaseAuth.auth,

  from: (table) => ({
    select: (columns = '*') => {
      const buildQuery = (eqFilters = {}) => ({
        eq: (key, value) => buildQuery({ ...eqFilters, [key]: value }),
        single: () => dbQuery(table, { select: columns, eq: eqFilters, single: true }),
        limit: (n) => dbQuery(table, { select: columns, eq: eqFilters, limit: n }),
        then: (resolve, reject) => {
          return dbQuery(table, { select: columns, eq: eqFilters })
            .then(resolve)
            .catch(reject)
        }
      })
      return buildQuery()
    },

    insert: (data) => ({
      select: () => ({
        single: () => dbQuery(table, { insert: data, single: true }),
        then: (resolve, reject) => {
          return dbQuery(table, { insert: data })
            .then(resolve)
            .catch(reject)
        }
      }),
      then: (resolve, reject) => {
        return dbQuery(table, { insert: data })
          .then(resolve)
          .catch(reject)
      }
    }),

    update: (data) => ({
      eq: (key, value) => ({
        select: () => ({
          single: () => dbQuery(table, { update: { data, eq: { [key]: value } }, single: true }),
          then: (resolve, reject) => {
            return dbQuery(table, { update: { data, eq: { [key]: value } } })
              .then(resolve)
              .catch(reject)
          }
        }),
        then: (resolve, reject) => {
          return dbQuery(table, { update: { data, eq: { [key]: value } } })
            .then(resolve)
            .catch(reject)
        }
      })
    })
  })
}
