import { useState, useEffect, useRef } from 'react'
import { useCollection } from '../contexts/CollectionContext'

export default function SavePopover({ lyricId, onClose }) {
  const { collections, addLyricToCollection, removeLyricFromCollection, getCollectionsForLyric } = useCollection()
  const [savedCollections, setSavedCollections] = useState([])
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
    async function load() {
      try {
        const lyricCollections = await getCollectionsForLyric(lyricId)
        setSavedCollections(lyricCollections.map(c => c.id))
      } catch (err) {
        console.error('Error loading save data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [lyricId])

  async function handleToggle(collectionId) {
    const isSaved = savedCollections.includes(collectionId)
    try {
      if (isSaved) {
        await removeLyricFromCollection(lyricId, collectionId)
        setSavedCollections(prev => prev.filter(id => id !== collectionId))
      } else {
        await addLyricToCollection(lyricId, collectionId)
        setSavedCollections(prev => [...prev, collectionId])
      }
    } catch (err) {
      console.error('Error toggling collection:', err)
    }
  }

  // Find the default "Saved" / "Favorites" collection (first one created)
  const defaultCollection = collections[0]
  const otherCollections = collections.slice(1).filter(c => !c.is_smart)

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 bg-white border border-charcoal/10 shadow-lg z-50 min-w-[200px] py-1"
    >
      {loading ? (
        <div className="px-4 py-2 text-xs text-charcoal/40">Loading...</div>
      ) : (
        <>
          {/* Default collection — quick save */}
          {defaultCollection && (
            <button
              onClick={() => handleToggle(defaultCollection.id)}
              className="w-full text-left px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full transition-colors ${
                savedCollections.includes(defaultCollection.id) ? 'bg-charcoal' : 'bg-charcoal/20'
              }`} />
              {savedCollections.includes(defaultCollection.id)
                ? `✓ In ${defaultCollection.name}`
                : `Save to ${defaultCollection.name}`
              }
            </button>
          )}

          {/* Other collections */}
          {otherCollections.length > 0 && (
            <div className="border-t border-charcoal/5 mt-1 pt-1">
              {otherCollections.map(col => (
                <button
                  key={col.id}
                  onClick={() => handleToggle(col.id)}
                  className="w-full text-left px-4 py-1.5 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full transition-colors ${
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
