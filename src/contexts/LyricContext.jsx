import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from './AuthContext'

const LyricContext = createContext({})

export function LyricProvider({ children }) {
  const { user } = useAuth()
  const [currentLyric, setCurrentLyric] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchCurrentLyric = useCallback(async () => {
    if (!user) {
      setCurrentLyric(null)
      setLoading(false)
      return
    }

    setLoading(true)

    // Safety timeout - force loading to false after 3 seconds
    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 3000)

    try {
      const { data, error } = await supabase
        .from('lyrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current lyric:', error)
      }
      setCurrentLyric(data || null)
    } catch (err) {
      console.error('Error fetching current lyric:', err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [user?.id]) // Only depend on user ID, not the whole user object

  useEffect(() => {
    // Only fetch when user ID actually changes (login/logout)
    fetchCurrentLyric()
  }, [fetchCurrentLyric])

  async function setLyric({ content, songTitle, artistName, theme = 'default' }) {
    if (!user) throw new Error('Must be logged in to set a lyric')

    try {
      // First, mark any existing current lyric as not current
      if (currentLyric) {
        const { error: updateError } = await supabase
          .from('lyrics')
          .update({ is_current: false, replaced_at: new Date().toISOString() })
          .eq('id', currentLyric.id)

        if (updateError) {
          console.error('Error updating previous lyric:', updateError)
          throw new Error('Failed to update previous lyric')
        }
      }

      // Create new lyric
      const { data, error } = await supabase
        .from('lyrics')
        .insert({
          user_id: user.id,
          content,
          song_title: songTitle || null,
          artist_name: artistName || null,
          theme,
          is_current: true,
          is_public: false,
        })
        .select()
        .single()

      if (error) {
        console.error('Error inserting lyric:', error)
        throw new Error(error.message || 'Failed to save lyric')
      }

      // Immediately update state for instant UI feedback
      setCurrentLyric(data)
      // Keep loading false - we're not in a loading state
      setLoading(false)
      return data
    } catch (err) {
      console.error('Error saving lyric:', err)
      // Re-throw with a more user-friendly message if needed
      if (err.message) {
        throw err
      }
      throw new Error('An unexpected error occurred while saving your lyric')
    }
  }

  async function updateLyric(updates) {
    if (!currentLyric) throw new Error('No current lyric to update')

    const { data, error } = await supabase
      .from('lyrics')
      .update(updates)
      .eq('id', currentLyric.id)
      .select()
      .single()

    if (error) throw error
    setCurrentLyric(data)
    return data
  }

  async function setTheme(theme) {
    return updateLyric({ theme })
  }

  async function setVisibility(isPublic) {
    return updateLyric({ is_public: isPublic })
  }

  async function replaceLyric({ content, songTitle, artistName, theme }) {
    return setLyric({ content, songTitle, artistName, theme: theme || currentLyric?.theme || 'default' })
  }

  const value = {
    currentLyric,
    loading,
    setLyric,
    updateLyric,
    setTheme,
    setVisibility,
    replaceLyric,
    refreshLyric: fetchCurrentLyric,
  }

  return <LyricContext.Provider value={value}>{children}</LyricContext.Provider>
}

export function useLyric() {
  const context = useContext(LyricContext)
  if (!context) {
    throw new Error('useLyric must be used within a LyricProvider')
  }
  return context
}
