import { useState, useEffect } from 'react'
import { useCollection } from '../contexts/CollectionContext'

export default function CollectionPicker({ lyricId, onToggle }) {
  const { collections, createCollection, addLyricToCollection, removeLyricFromCollection, getCollectionsForLyric } = useCollection()
  const [selectedCollections, setSelectedCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [creating, setCreating] = useState(false)

  // Fetch which collections this lyric is in
  useEffect(() => {
    async function loadCollections() {
      if (!lyricId) {
        setLoading(false)
        return
      }

      try {
        const lyricCollections = await getCollectionsForLyric(lyricId)
        setSelectedCollections(lyricCollections.map(c => c.id))
      } catch (err) {
        console.error('Error loading collections:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCollections()
  }, [lyricId])

  const handleToggle = async (collectionId) => {
    const isSelected = selectedCollections.includes(collectionId)

    try {
      if (isSelected) {
        await removeLyricFromCollection(lyricId, collectionId)
        setSelectedCollections(prev => prev.filter(id => id !== collectionId))
      } else {
        await addLyricToCollection(lyricId, collectionId)
        setSelectedCollections(prev => [...prev, collectionId])
      }

      if (onToggle) onToggle()
    } catch (err) {
      console.error('Error toggling collection:', err)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newCollectionName.trim()) return

    setCreating(true)
    try {
      const newCollection = await createCollection({
        name: newCollectionName.trim(),
        color: 'charcoal',
      })

      // Automatically add lyric to new collection
      await addLyricToCollection(lyricId, newCollection.id)
      setSelectedCollections(prev => [...prev, newCollection.id])

      setNewCollectionName('')
      setShowCreateForm(false)

      if (onToggle) onToggle()
    } catch (err) {
      console.error('Error creating collection:', err)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-charcoal-light">Loading collections...</div>
  }

  const colorMap = {
    charcoal: 'bg-charcoal',
    coral: 'bg-[#FF6B6B]',
    sage: 'bg-[#95B8A3]',
    lavender: 'bg-[#B8A3D1]',
    amber: 'bg-[#F4A261]',
    ocean: 'bg-[#4A90A4]',
  }

  return (
    <div>
      {collections.length === 0 && !showCreateForm ? (
        <p className="text-sm text-charcoal-light/60 mb-3">
          No collections yet. Create one to organize your lyrics.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {collections.map((collection) => {
            const isSelected = selectedCollections.includes(collection.id)
            const isSmart = collection.is_smart
            const colorClass = colorMap[collection.color] || colorMap.charcoal

            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => !isSmart && handleToggle(collection.id)}
                disabled={isSmart}
                className={`flex items-center gap-2 px-3 py-2 text-sm text-left border transition-colors ${
                  isSelected
                    ? 'border-charcoal bg-charcoal/5'
                    : 'border-charcoal/20 hover:border-charcoal/40'
                } ${isSmart ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isSmart ? `Smart collection based on #${collection.smart_tag}` : ''}
              >
                <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                <span className="flex-1 truncate">{collection.name}</span>
                {isSelected && !isSmart && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="3,8 6,11 13,4" />
                  </svg>
                )}
                {isSmart && (
                  <span className="text-xs text-charcoal-light/60">auto</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {showCreateForm ? (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="Collection name"
            autoFocus
            className="flex-1 px-3 py-2 text-sm bg-transparent border border-charcoal/20
                       focus:border-charcoal/40 focus:outline-none
                       placeholder:text-charcoal-light/50 text-charcoal"
          />
          <button
            type="submit"
            disabled={!newCollectionName.trim() || creating}
            className="px-4 py-2 text-sm border border-charcoal/30 hover:border-charcoal/60
                       disabled:opacity-40 transition-colors"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(false)
              setNewCollectionName('')
            }}
            className="px-3 py-2 text-sm text-charcoal-light hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
        >
          + Create new collection
        </button>
      )}
    </div>
  )
}
