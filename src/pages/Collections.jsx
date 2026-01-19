import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../contexts/CollectionContext'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'

// Collection color mapping
const collectionColors = {
  charcoal: 'bg-charcoal',
  coral: 'bg-[#FF6B6B]',
  sage: 'bg-[#51B695]',
  lavender: 'bg-[#9B89B3]',
  amber: 'bg-[#F0A500]',
  ocean: 'bg-[#4A90E2]',
}

function CollectionCard({ collection, lyricCount }) {
  const colorClass = collectionColors[collection.color] || collectionColors.charcoal

  return (
    <Link
      to={`/collections/${collection.id}`}
      className="block p-6 border border-charcoal/10 hover:border-charcoal/30
                 transition-all hover:shadow-sm group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-3 h-3 rounded-full ${colorClass} flex-shrink-0 mt-1.5`} />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-charcoal group-hover:opacity-70 transition-opacity">
            {collection.name}
          </h3>
          {collection.description && (
            <p className="text-sm text-charcoal-light/70 mt-1 line-clamp-2">
              {collection.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-charcoal/10">
        <span className="text-xs text-charcoal-light/60">
          {lyricCount} {lyricCount === 1 ? 'lyric' : 'lyrics'}
        </span>
        {collection.is_smart && (
          <span className="text-xs text-charcoal-light/50 italic">
            #{collection.smart_tag}
          </span>
        )}
      </div>
    </Link>
  )
}

export default function Collections() {
  const { user } = useAuth()
  const { collections, loading, createCollection } = useCollection()
  const [lyricCounts, setLyricCounts] = useState({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    async function fetchLyricCounts() {
      if (!collections || collections.length === 0) {
        setLoadingCounts(false)
        return
      }

      setLoadingCounts(true)
      const counts = {}

      for (const collection of collections) {
        if (collection.is_smart) {
          // Smart collection: count lyrics with the tag
          const { data, error } = await supabase
            .from('lyrics')
            .select('id')
            .eq('user_id', user.id)
            .contains('tags', [collection.smart_tag])

          counts[collection.id] = error ? 0 : (data?.length || 0)
        } else {
          // Manual collection: count from junction table
          const { data, error } = await supabase
            .from('lyric_collections')
            .select('id')
            .eq('collection_id', collection.id)

          counts[collection.id] = error ? 0 : (data?.length || 0)
        }
      }

      setLyricCounts(counts)
      setLoadingCounts(false)
    }

    fetchLyricCounts()
  }, [collections, user?.id])

  async function handleCreateCollection(e) {
    e.preventDefault()
    if (!newCollectionName.trim()) return

    setIsCreating(true)
    try {
      await createCollection({
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim(),
        color: 'charcoal',
      })
      setNewCollectionName('')
      setNewCollectionDescription('')
      setShowCreateForm(false)
    } catch (err) {
      console.error('Error creating collection:', err)
    } finally {
      setIsCreating(false)
    }
  }

  if (loading || loadingCounts) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-sm text-charcoal-light/60">Loading collections...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-medium text-charcoal mb-2">Collections</h1>
          <p className="text-sm text-charcoal-light/70">
            Organize your lyrics by theme, mood, or any way you like
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-sm text-charcoal border border-charcoal/30 hover:border-charcoal/60 transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ New collection'}
        </button>
      </div>

      {/* Create collection form */}
      {showCreateForm && (
        <form onSubmit={handleCreateCollection} className="mb-8 p-6 border border-charcoal/20 bg-charcoal/5">
          <h3 className="text-sm font-medium text-charcoal mb-4">Create new collection</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              className="w-full px-4 py-2 text-sm bg-cream border border-charcoal/20
                         focus:border-charcoal/40 focus:outline-none
                         placeholder:text-charcoal-light/50 text-charcoal"
              autoFocus
            />
            <textarea
              value={newCollectionDescription}
              onChange={(e) => setNewCollectionDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-4 py-2 text-sm bg-cream border border-charcoal/20
                         focus:border-charcoal/40 focus:outline-none resize-none
                         placeholder:text-charcoal-light/50 text-charcoal"
            />
            <button
              type="submit"
              disabled={!newCollectionName.trim() || isCreating}
              className="px-4 py-2 text-sm text-charcoal border border-charcoal/30 hover:border-charcoal/60
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create collection'}
            </button>
          </div>
        </form>
      )}

      {/* Collections grid */}
      {collections.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-charcoal-light/60 mb-4">
            You haven't created any collections yet
          </p>
          <p className="text-sm text-charcoal-light/50">
            Collections help you organize your lyrics by theme, mood, or any way you like.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              lyricCount={lyricCounts[collection.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
