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
  const { collections, loading, createCollection, getAllUserTags } = useCollection()
  const [lyricCounts, setLyricCounts] = useState({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')
  const [newCollectionColor, setNewCollectionColor] = useState('charcoal')
  const [isSmart, setIsSmart] = useState(false)
  const [smartTag, setSmartTag] = useState('')
  const [allTags, setAllTags] = useState([])
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
          // Smart collection: fetch all user lyrics and filter client-side
          const { data, error } = await supabase
            .from('lyrics')
            .select('id, tags')
            .eq('user_id', user.id)

          if (error) {
            counts[collection.id] = 0
          } else {
            // Filter client-side for lyrics containing the smart tag
            const filtered = data?.filter(lyric =>
              lyric.tags && lyric.tags.includes(collection.smart_tag)
            ) || []
            counts[collection.id] = filtered.length
          }
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

  useEffect(() => {
    async function fetchTags() {
      const tags = await getAllUserTags()
      setAllTags(tags)
    }
    fetchTags()
  }, [getAllUserTags])

  async function handleCreateCollection(e) {
    e.preventDefault()
    if (!newCollectionName.trim()) return
    if (isSmart && !smartTag.trim()) return

    setIsCreating(true)
    try {
      await createCollection({
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim(),
        color: newCollectionColor,
        isSmart: isSmart,
        smartTag: isSmart ? smartTag.trim() : null,
      })
      setNewCollectionName('')
      setNewCollectionDescription('')
      setNewCollectionColor('charcoal')
      setIsSmart(false)
      setSmartTag('')
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
          <div className="space-y-4">
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

            {/* Color picker */}
            <div>
              <label className="text-xs text-charcoal-light/70 mb-2 block">Color</label>
              <div className="flex gap-2">
                {Object.entries(collectionColors).map(([colorName, colorClass]) => (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => setNewCollectionColor(colorName)}
                    className={`w-8 h-8 rounded-full ${colorClass} transition-all ${
                      newCollectionColor === colorName
                        ? 'ring-2 ring-charcoal ring-offset-2 ring-offset-cream'
                        : 'hover:ring-1 hover:ring-charcoal/30'
                    }`}
                    title={colorName}
                  />
                ))}
              </div>
            </div>

            {/* Smart collection toggle */}
            <div className="pt-3 border-t border-charcoal/10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSmart}
                  onChange={(e) => setIsSmart(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-charcoal">Smart collection (auto-populate from tag)</span>
              </label>
            </div>

            {/* Tag selector for smart collections */}
            {isSmart && (
              <div>
                <label className="text-xs text-charcoal-light/70 mb-2 block">Tag to filter by</label>
                {allTags.length > 0 ? (
                  <select
                    value={smartTag}
                    onChange={(e) => setSmartTag(e.target.value)}
                    className="w-full px-4 py-2 text-sm bg-cream border border-charcoal/20
                               focus:border-charcoal/40 focus:outline-none text-charcoal"
                  >
                    <option value="">Select a tag...</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>#{tag}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-charcoal-light/60 italic">
                    No tags found. Add tags to your lyrics first.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!newCollectionName.trim() || (isSmart && !smartTag.trim()) || isCreating}
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
