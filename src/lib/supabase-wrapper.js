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
async function dbQuery(table, {
  select, insert, update, upsert, delete: doDelete,
  eq, single, limit, order, contains, ilike, inFilter
} = {}) {
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
    // Support .contains() for array containment (e.g., tags)
    // PostgREST expects PostgreSQL array format: {value1,value2}
    if (contains) {
      for (const [key, value] of Object.entries(contains)) {
        const pgArray = `{${value.join(',')}}`
        params.append(key, `cs.${pgArray}`)
      }
    }
    // Support .ilike() for case-insensitive matching
    if (ilike) {
      for (const [key, value] of Object.entries(ilike)) {
        params.append(key, `ilike.${value}`)
      }
    }
    // Support .in() for array of values
    if (inFilter) {
      for (const [key, values] of Object.entries(inFilter)) {
        params.append(key, `in.(${values.join(',')})`)
      }
    }
    // Support .order() for sorting
    if (order) {
      const orderStr = order.map(o => `${o.column}.${o.ascending ? 'asc' : 'desc'}`).join(',')
      params.append('order', orderStr)
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
  } else if (upsert) {
    method = 'POST'
    body = JSON.stringify(upsert)
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation'
  } else if (doDelete) {
    method = 'DELETE'
    headers['Prefer'] = 'return=representation'
    if (eq) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(eq)) {
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
      // Build a chainable query object with all filter options
      const buildQuery = (filters = {}) => {
        const { eqFilters = {}, containsFilters = {}, ilikeFilters = {}, inFilters = {}, orderBy = [], limitVal = null } = filters

        const queryObj = {
          eq: (key, value) => buildQuery({
            ...filters,
            eqFilters: { ...eqFilters, [key]: value }
          }),
          contains: (key, value) => buildQuery({
            ...filters,
            containsFilters: { ...containsFilters, [key]: value }
          }),
          ilike: (key, value) => buildQuery({
            ...filters,
            ilikeFilters: { ...ilikeFilters, [key]: value }
          }),
          in: (key, values) => buildQuery({
            ...filters,
            inFilters: { ...inFilters, [key]: values }
          }),
          order: (column, { ascending = true } = {}) => buildQuery({
            ...filters,
            orderBy: [...orderBy, { column, ascending }]
          }),
          limit: (n) => buildQuery({
            ...filters,
            limitVal: n
          }),
          single: () => dbQuery(table, {
            select: columns,
            eq: Object.keys(eqFilters).length ? eqFilters : undefined,
            contains: Object.keys(containsFilters).length ? containsFilters : undefined,
            ilike: Object.keys(ilikeFilters).length ? ilikeFilters : undefined,
            inFilter: Object.keys(inFilters).length ? inFilters : undefined,
            order: orderBy.length ? orderBy : undefined,
            limit: limitVal,
            single: true
          }),
          then: (resolve, reject) => {
            return dbQuery(table, {
              select: columns,
              eq: Object.keys(eqFilters).length ? eqFilters : undefined,
              contains: Object.keys(containsFilters).length ? containsFilters : undefined,
              ilike: Object.keys(ilikeFilters).length ? ilikeFilters : undefined,
              inFilter: Object.keys(inFilters).length ? inFilters : undefined,
              order: orderBy.length ? orderBy : undefined,
              limit: limitVal
            }).then(resolve).catch(reject)
          }
        }
        return queryObj
      }
      return buildQuery()
    },

    insert: (data) => ({
      select: () => ({
        single: async () => {
          // For insert with select().single(), we need to return the inserted row
          const headers = {
            'apikey': supabaseAnonKey,
            'Authorization': cachedAccessToken ? `Bearer ${cachedAccessToken}` : `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(data)
            })
            if (!response.ok) {
              const error = await response.json()
              return { data: null, error }
            }
            let result = await response.json()
            // Unwrap array to single object
            if (Array.isArray(result) && result.length === 1) {
              result = result[0]
            }
            return { data: result, error: null }
          } catch (err) {
            return { data: null, error: err }
          }
        },
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

    update: (data) => {
      // Support chained .eq() calls for update
      const buildUpdateQuery = (eqFilters = {}) => ({
        eq: (key, value) => buildUpdateQuery({ ...eqFilters, [key]: value }),
        select: () => ({
          single: () => dbQuery(table, { update: { data, eq: eqFilters }, single: true }),
          then: (resolve, reject) => {
            return dbQuery(table, { update: { data, eq: eqFilters } })
              .then(resolve)
              .catch(reject)
          }
        }),
        then: (resolve, reject) => {
          return dbQuery(table, { update: { data, eq: eqFilters } })
            .then(resolve)
            .catch(reject)
        }
      })
      return buildUpdateQuery()
    },

    upsert: (data, options = {}) => ({
      select: () => ({
        single: async () => {
          // For upsert with select().single(), ensure we get the upserted row back
          const headers = {
            'apikey': supabaseAnonKey,
            'Authorization': cachedAccessToken ? `Bearer ${cachedAccessToken}` : `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation'
          }
          try {
            // Add on_conflict parameter if specified
            let url = `${supabaseUrl}/rest/v1/${table}`
            if (options.onConflict) {
              url += `?on_conflict=${options.onConflict}`
            }
            const response = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify(data)
            })
            if (!response.ok) {
              const error = await response.json()
              return { data: null, error }
            }
            let result = await response.json()
            // Unwrap array to single object
            if (Array.isArray(result) && result.length === 1) {
              result = result[0]
            }
            return { data: result, error: null }
          } catch (err) {
            return { data: null, error: err }
          }
        },
        then: (resolve, reject) => {
          return dbQuery(table, { upsert: data })
            .then(resolve)
            .catch(reject)
        }
      }),
      then: (resolve, reject) => {
        return dbQuery(table, { upsert: data })
          .then(resolve)
          .catch(reject)
      }
    }),

    delete: () => {
      const buildDeleteQuery = (eqFilters = {}) => ({
        eq: (key, value) => buildDeleteQuery({ ...eqFilters, [key]: value }),
        then: (resolve, reject) => {
          return dbQuery(table, { delete: true, eq: eqFilters })
            .then(resolve)
            .catch(reject)
        }
      })
      return buildDeleteQuery()
    }
  })
}
