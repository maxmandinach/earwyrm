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

function CollectionCard({ collection, lyricCount, onEdit, onDelete }) {
  const colorClass = collectionColors[collection.color] || collectionColors.charcoal
  const [showMenu, setShowMenu] = useState(false)

  const handleEdit = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(false)
    onEdit(collection)
  }

  const handleDelete = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(false)
    if (confirm(`Delete "${collection.name}"? This cannot be undone.`)) {
      onDelete(collection.id)
    }
  }

  return (
    <div className="relative">
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
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="text-charcoal-light/40 hover:text-charcoal transition-colors p-1"
          >
            ⋯
          </button>
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

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-6 top-6 z-20 bg-cream border border-charcoal/20 shadow-lg min-w-[120px]">
            <button
              onClick={handleEdit}
              className="block w-full text-left px-4 py-2 text-xs text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="block w-full text-left px-4 py-2 text-xs text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function Collections() {
  const { user } = useAuth()
  const { collections, loading, createCollection, updateCollection, deleteCollection, getAllUserTags } = useCollection()
  const [lyricCounts, setLyricCounts] = useState({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
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

  function handleEdit(collection) {
    setEditingCollection(collection)
    setNewCollectionName(collection.name)
    setNewCollectionDescription(collection.description || '')
    setNewCollectionColor(collection.color || 'charcoal')
    setIsSmart(collection.is_smart || false)
    setSmartTag(collection.smart_tag || '')
    setShowCreateForm(true)
  }

  async function handleDelete(collectionId) {
    try {
      await deleteCollection(collectionId)
    } catch (err) {
      console.error('Error deleting collection:', err)
      alert('Failed to delete collection. Please try again.')
    }
  }

  async function handleCreateCollection(e) {
    e.preventDefault()
    if (!newCollectionName.trim()) return
    if (isSmart && !smartTag.trim()) return

    setIsCreating(true)
    try {
      if (editingCollection) {
        // Update existing collection
        await updateCollection(editingCollection.id, {
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim(),
          color: newCollectionColor,
          is_smart: isSmart,
          smart_tag: isSmart ? smartTag.trim() : null,
        })
        setEditingCollection(null)
      } else {
        // Create new collection
        await createCollection({
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim(),
          color: newCollectionColor,
          isSmart: isSmart,
          smartTag: isSmart ? smartTag.trim() : null,
        })
      }
      setNewCollectionName('')
      setNewCollectionDescription('')
      setNewCollectionColor('charcoal')
      setIsSmart(false)
      setSmartTag('')
      setShowCreateForm(false)
    } catch (err) {
      console.error('Error saving collection:', err)
      alert('Failed to save collection. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  function handleCancelForm() {
    setShowCreateForm(false)
    setEditingCollection(null)
    setNewCollectionName('')
    setNewCollectionDescription('')
    setNewCollectionColor('charcoal')
    setIsSmart(false)
    setSmartTag('')
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
      <div className="mb-8">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-medium text-charcoal">Collections</h1>
          <button
            onClick={() => showCreateForm ? handleCancelForm() : setShowCreateForm(true)}
            className="text-xs text-charcoal-light hover:text-charcoal transition-colors"
          >
            {showCreateForm ? '✕ Cancel' : '+ New'}
          </button>
        </div>
        <p className="text-sm text-charcoal-light/70">
          Organize your lyrics by theme, mood, or any way you like
        </p>
      </div>

      {/* Create/Edit collection form */}
      {showCreateForm && (
        <form onSubmit={handleCreateCollection} className="mb-8 p-6 border border-charcoal/20 bg-charcoal/5">
          <h3 className="text-sm font-medium text-charcoal mb-4">
            {editingCollection ? 'Edit collection' : 'Create new collection'}
          </h3>
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
              {isCreating ? 'Saving...' : (editingCollection ? 'Update collection' : 'Create collection')}
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
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
