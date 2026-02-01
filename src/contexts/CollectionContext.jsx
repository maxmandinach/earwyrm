import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from './AuthContext'

const CollectionContext = createContext({})

export function CollectionProvider({ children }) {
  const { user } = useAuth()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCollections = useCallback(async () => {
    if (!user) {
      setCollections([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching collections:', error)
        setCollections([])
        setLoading(false)
        return
      }

      // If user has no collections, create default "Favorites" collection
      if (!data || data.length === 0) {
        console.log('No collections found, creating Favorites...')
        try {
          const { data: newCollection, error: createError } = await supabase
            .from('collections')
            .insert({
              user_id: user.id,
              name: 'My Keepsakes',
              description: 'Lyrics you want to hold onto',
              color: 'charcoal',
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating Favorites collection:', createError)
            setCollections([])
          } else if (newCollection) {
            console.log('Favorites collection created:', newCollection)
            setCollections([newCollection])
          } else {
            setCollections([])
          }
        } catch (createErr) {
          console.error('Exception creating default collection:', createErr)
          setCollections([])
        }
      } else {
        // Sort by created_at (oldest first)
        const sorted = [...data].sort((a, b) =>
          new Date(a.created_at) - new Date(b.created_at)
        )
        setCollections(sorted)
      }
    } catch (err) {
      console.error('Exception fetching collections:', err)
      setCollections([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  async function createCollection({ name, description = '', color = 'charcoal', isSmart = false, smartTag = null }) {
    if (!user) throw new Error('Must be logged in to create a collection')

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name,
        description,
        color,
        is_smart: isSmart,
        smart_tag: smartTag,
      })
      .select()
      .single()

    if (error) throw error

    // Add to local state
    setCollections(prev => [...prev, data])
    return data
  }

  async function updateCollection(id, updates) {
    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update local state
    setCollections(prev =>
      prev.map(col => (col.id === id ? data : col))
    )
    return data
  }

  async function deleteCollection(id) {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Remove from local state
    setCollections(prev => prev.filter(col => col.id !== id))
  }

  async function addLyricToCollection(lyricId, collectionId) {
    // Check if collection is smart
    const collection = collections.find(c => c.id === collectionId)
    if (collection?.is_smart) {
      throw new Error('Cannot manually add lyrics to smart collections')
    }

    const { error } = await supabase
      .from('lyric_collections')
      .insert({
        lyric_id: lyricId,
        collection_id: collectionId,
      })

    if (error) {
      // If duplicate, ignore error
      if (error.code === '23505') return
      throw error
    }
  }

  async function removeLyricFromCollection(lyricId, collectionId) {
    const { error } = await supabase
      .from('lyric_collections')
      .delete()
      .eq('lyric_id', lyricId)
      .eq('collection_id', collectionId)

    if (error) throw error
  }

  async function getCollectionsForLyric(lyricId) {
    const { data, error } = await supabase
      .from('lyric_collections')
      .select(`
        collection_id,
        collections (*)
      `)
      .eq('lyric_id', lyricId)

    if (error) throw error
    return data.map(item => item.collections)
  }

  async function getLyricsInCollection(collectionId) {
    const collection = collections.find(c => c.id === collectionId)

    if (!collection) {
      throw new Error('Collection not found')
    }

    if (collection.is_smart) {
      // Smart collection: fetch all user lyrics and filter client-side
      const { data, error } = await supabase
        .from('lyrics')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      // Filter client-side for lyrics containing the smart tag
      const filtered = data?.filter(lyric =>
        lyric.tags && lyric.tags.includes(collection.smart_tag)
      ) || []

      // Sort by created_at descending (newest first)
      return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else {
      // Manual collection: join through junction table
      const { data, error } = await supabase
        .from('lyric_collections')
        .select(`
          lyric_id,
          lyrics (*)
        `)
        .eq('collection_id', collectionId)

      if (error) throw error
      return data.map(item => item.lyrics).filter(Boolean)
    }
  }

  async function getAllUserTags() {
    if (!user) return []

    const { data, error } = await supabase
      .from('lyrics')
      .select('tags')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching tags:', error)
      return []
    }

    // Extract all tags and get unique values
    const allTags = data
      .flatMap(lyric => lyric.tags || [])
      .filter((tag, index, self) => self.indexOf(tag) === index)

    return allTags
  }

  const value = {
    collections,
    loading,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addLyricToCollection,
    removeLyricFromCollection,
    getCollectionsForLyric,
    getLyricsInCollection,
    getAllUserTags,
  }

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>
}

export function useCollection() {
  const context = useContext(CollectionContext)
  if (!context) {
    throw new Error('useCollection must be used within a CollectionProvider')
  }
  return context
}
