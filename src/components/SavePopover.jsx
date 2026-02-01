import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'

export default function SavePopover({ lyricId, onClose }) {
  const { user } = useAuth()
  const [collections, setCollections] = useState([])
  const [savedCollections, setSavedCollections] = useState([])
  const [savedToProfile, setSavedToProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        // Fetch user's collections
        const { data: cols } = await supabase
          .from('collections')
          .select('id, name, color')
          .eq('user_id', user.id)
          .order('name')

        setCollections(cols || [])

        // Check if lyric is already in any collections
        if (cols && cols.length > 0) {
          const { data: items } = await supabase
            .from('collection_items')
            .select('collection_id')
            .eq('lyric_id', lyricId)
            .in('collection_id', cols.map(c => c.id))

          setSavedCollections((items || []).map(i => i.collection_id))
        }

        // Check if saved to profile (user has their own copy)
        const { data: own } = await supabase
          .from('lyrics')
          .select('id')
          .eq('user_id', user.id)
          .eq('canonical_lyric_id', lyricId)
          .single()

        setSavedToProfile(!!own)
      } catch (err) {
        console.error('Error loading save data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, lyricId])

  async function handleSaveToProfile() {
    if (savedToProfile) return
    try {
      // Fetch the original lyric to copy
      const { data: original } = await supabase
        .from('lyrics')
        .select('content, song_title, artist_name, tags')
        .eq('id', lyricId)
        .single()

      if (!original) return

      await supabase.from('lyrics').insert({
        user_id: user.id,
        content: original.content,
        song_title: original.song_title,
        artist_name: original.artist_name,
        tags: original.tags,
        canonical_lyric_id: lyricId,
        is_public: false,
      })

      setSavedToProfile(true)
    } catch (err) {
      console.error('Error saving to profile:', err)
    }
  }

  async function handleToggleCollection(collectionId) {
    const isSaved = savedCollections.includes(collectionId)
    try {
      if (isSaved) {
        await supabase
          .from('collection_items')
          .delete()
          .eq('lyric_id', lyricId)
          .eq('collection_id', collectionId)
        setSavedCollections(prev => prev.filter(id => id !== collectionId))
      } else {
        await supabase
          .from('collection_items')
          .insert({ lyric_id: lyricId, collection_id: collectionId })
        setSavedCollections(prev => [...prev, collectionId])
      }
    } catch (err) {
      console.error('Error toggling collection:', err)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 bg-white border border-charcoal/10 shadow-lg z-50 min-w-[200px] py-1"
    >
      {loading ? (
        <div className="px-4 py-2 text-xs text-charcoal/40">Loading...</div>
      ) : (
        <>
          <button
            onClick={handleSaveToProfile}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
              savedToProfile
                ? 'text-charcoal/40 cursor-default'
                : 'text-charcoal/70 hover:bg-charcoal/5'
            }`}
          >
            {savedToProfile ? '✓ Saved to profile' : 'Save to profile'}
          </button>
          {collections.length > 0 && (
            <div className="border-t border-charcoal/5 mt-1 pt-1">
              <div className="px-4 py-1 text-xs text-charcoal/30">Collections</div>
              {collections.map(col => (
                <button
                  key={col.id}
                  onClick={() => handleToggleCollection(col.id)}
                  className="w-full text-left px-4 py-1.5 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    savedCollections.includes(col.id) ? 'bg-charcoal' : 'bg-charcoal/20'
                  }`} />
                  {col.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
