import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from './AuthContext'

const LyricContext = createContext({})

// Note: New lyrics inherit visibility from profile.is_public

export function LyricProvider({ children }) {
  const { user, profile } = useAuth()
  const [currentLyric, setCurrentLyric] = useState(null)
  const [currentNote, setCurrentNote] = useState(null)
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

      if (data) {
        setCurrentLyric(data)
      } else {
        // No is_current lyric — fallback to most recent non-copy lyric and restore it
        // Exclude lyrics that were saved copies from other users (have canonical_lyric_id
        // pointing to someone else's lyric)
        const { data: fallback } = await supabase
          .from('lyrics')
          .select('*')
          .eq('user_id', user.id)
          .is('canonical_lyric_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (fallback) {
          await supabase
            .from('lyrics')
            .update({ is_current: true })
            .eq('id', fallback.id)
          setCurrentLyric({ ...fallback, is_current: true })
        } else {
          setCurrentLyric(null)
        }
      }
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

  async function setLyric({ content, songTitle, artistName, tags = [], theme = 'signature', canonicalLyricId = null }) {
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

      // Create new lyric - inherit visibility from profile
      // Normalize artist/song names: lowercase + trim
      const { data, error } = await supabase
        .from('lyrics')
        .insert({
          user_id: user.id,
          content,
          song_title: songTitle?.trim() || null,
          artist_name: artistName?.trim() || null,
          tags: tags || [],
          theme,
          is_current: true,
          is_public: profile?.is_public || false,
          canonical_lyric_id: canonicalLyricId || null,
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

  async function replaceLyric({ content, songTitle, artistName, tags, canonicalLyricId }) {
    return updateLyric({
      content,
      song_title: songTitle?.trim() || null,
      artist_name: artistName?.trim() || null,
      tags: tags || [],
      canonical_lyric_id: canonicalLyricId || null,
    })
  }

  async function fetchNoteForLyric(lyricId) {
    if (!user) return null

    const { data, error } = await supabase
      .from('lyric_notes')
      .select('*')
      .eq('lyric_id', lyricId)
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching note:', error)
      return null
    }

    return data
  }

  async function saveNote(lyricId, content, isPublic = false, noteTypes = []) {
    if (!user) throw new Error('Must be logged in to save notes')
    if (!content || !content.trim()) {
      return deleteNote(lyricId)
    }

    const { data, error } = await supabase
      .from('lyric_notes')
      .upsert({
        lyric_id: lyricId,
        user_id: user.id,
        content: content.trim(),
        is_public: isPublic,
        note_types: noteTypes,
      }, { onConflict: 'lyric_id,user_id' })
      .select()
      .single()

    if (error) throw error

    // Update current note if this is the current lyric
    if (currentLyric?.id === lyricId) {
      setCurrentNote(data)
    }

    return data
  }

  async function deleteNote(lyricId) {
    if (!user) throw new Error('Must be logged in to delete notes')

    const { error } = await supabase
      .from('lyric_notes')
      .delete()
      .eq('lyric_id', lyricId)
      .eq('user_id', user.id)

    if (error) throw error

    // Clear current note if this is the current lyric
    if (currentLyric?.id === lyricId) {
      setCurrentNote(null)
    }
  }

  const value = {
    currentLyric,
    currentNote,
    loading,
    setLyric,
    updateLyric,
    setTheme,
    setVisibility,
    replaceLyric,
    refreshLyric: fetchCurrentLyric,
    fetchNoteForLyric,
    saveNote,
    deleteNote,
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
