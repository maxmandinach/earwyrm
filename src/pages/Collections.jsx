import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../contexts/CollectionContext'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'

function CollectionCard({ collection, lyricCount, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <Link
        to={`/collections/${collection.id}`}
        className="block p-5 transition-all group"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.06)',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base text-charcoal/70 group-hover:text-charcoal transition-colors">
              {collection.name}
            </h3>
            {collection.description && (
              <p className="text-sm text-charcoal/40 mt-1 line-clamp-2">
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
            className="text-charcoal/20 hover:text-charcoal/50 transition-colors p-1 ml-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>

        <div
          className="flex items-center justify-between pt-3 mt-3"
          style={{ borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
        >
          <span className="text-xs text-charcoal/30">
            {lyricCount} {lyricCount === 1 ? 'lyric' : 'lyrics'}
          </span>
          {collection.is_smart && (
            <span className="text-xs text-charcoal/30 italic">
              #{collection.smart_tag}
            </span>
          )}
        </div>
      </Link>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div
            className="absolute right-4 top-12 z-20 min-w-[100px] py-1"
            style={{
              backgroundColor: 'var(--surface-elevated, #FAF8F5)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
            }}
          >
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMenu(false)
                onEdit(collection)
              }}
              className="block w-full text-left px-4 py-2 text-xs text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              edit
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMenu(false)
                if (confirm(`Delete "${collection.name}"? This cannot be undone.`)) {
                  onDelete(collection.id)
                }
              }}
              className="block w-full text-left px-4 py-2 text-xs text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              delete
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

      const smartCollections = collections.filter(c => c.is_smart)
      const manualCollections = collections.filter(c => !c.is_smart)

      const promises = []

      if (smartCollections.length > 0) {
        promises.push(
          supabase
            .from('lyrics')
            .select('id, tags')
            .eq('user_id', user.id)
            .then(({ data, error }) => {
              for (const collection of smartCollections) {
                if (error) {
                  counts[collection.id] = 0
                } else {
                  const filtered = data?.filter(lyric =>
                    lyric.tags && lyric.tags.includes(collection.smart_tag)
                  ) || []
                  counts[collection.id] = filtered.length
                }
              }
            })
        )
      }

      for (const collection of manualCollections) {
        promises.push(
          supabase
            .from('lyric_collections')
            .select('id')
            .eq('collection_id', collection.id)
            .then(({ data, error }) => {
              counts[collection.id] = error ? 0 : (data?.length || 0)
            })
        )
      }

      await Promise.all(promises)
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
        await updateCollection(editingCollection.id, {
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim(),
          is_smart: isSmart,
          smart_tag: isSmart ? smartTag.trim() : null,
        })
        setEditingCollection(null)
      } else {
        await createCollection({
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim(),
          isSmart: isSmart,
          smartTag: isSmart ? smartTag.trim() : null,
        })
      }
      setNewCollectionName('')
      setNewCollectionDescription('')
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
    setIsSmart(false)
    setSmartTag('')
  }

  if (loading || loadingCounts) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="skeleton h-6 w-32 mb-3" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="p-5"
              style={{
                backgroundColor: 'var(--surface-card, #F5F2ED)',
                border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
              }}
            >
              <div className="skeleton h-5 w-28 mb-2" />
              <div className="skeleton h-4 w-40 mb-4" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase">collections</h1>
          <button
            onClick={() => showCreateForm ? handleCancelForm() : setShowCreateForm(true)}
            className="text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors"
          >
            {showCreateForm ? 'cancel' : '+ new'}
          </button>
        </div>
        <p className="text-sm text-charcoal/40">
          Organize your lyrics by theme, mood, or any way you like
        </p>
      </div>

      {/* Create/Edit collection form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateCollection}
          className="mb-8 p-5"
          style={{
            backgroundColor: 'var(--surface-card, #F5F2ED)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.06)',
            border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
          }}
        >
          <h3 className="text-sm text-charcoal/40 mb-4 lowercase">
            {editingCollection ? 'edit collection' : 'new collection'}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              className="w-full px-3 py-2 text-sm bg-transparent border border-charcoal/10
                         focus:border-charcoal/30 focus:outline-none
                         placeholder:text-charcoal/25 text-charcoal"
              autoFocus
            />
            <textarea
              value={newCollectionDescription}
              onChange={(e) => setNewCollectionDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 text-sm bg-transparent border border-charcoal/10
                         focus:border-charcoal/30 focus:outline-none resize-none
                         placeholder:text-charcoal/25 text-charcoal"
            />

            {/* Smart collection toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <span
                  onClick={() => setIsSmart(!isSmart)}
                  className={`w-4 h-4 border flex items-center justify-center transition-colors cursor-pointer ${
                    isSmart ? 'border-charcoal/40 bg-charcoal/10' : 'border-charcoal/15'
                  }`}
                >
                  {isSmart && <span className="text-charcoal/60 text-xs">✓</span>}
                </span>
                <span className="text-xs text-charcoal/40">Smart collection (auto-populate from tag)</span>
              </label>
            </div>

            {/* Tag selector for smart collections */}
            {isSmart && (
              <div>
                <label className="text-xs text-charcoal/30 mb-1.5 block">Tag to filter by</label>
                {allTags.length > 0 ? (
                  <select
                    value={smartTag}
                    onChange={(e) => setSmartTag(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-transparent border border-charcoal/10
                               focus:border-charcoal/30 focus:outline-none text-charcoal"
                  >
                    <option value="">Select a tag...</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>#{tag}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-charcoal/30 italic">
                    No tags found. Add tags to your lyrics first.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!newCollectionName.trim() || (isSmart && !smartTag.trim()) || isCreating}
              className="px-4 py-2 text-xs text-charcoal/50 border border-charcoal/15 hover:border-charcoal/40 hover:text-charcoal/70
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'saving...' : (editingCollection ? 'update' : 'create')}
            </button>
          </div>
        </form>
      )}

      {/* Collections list */}
      {collections.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-charcoal/40 mb-2">No collections yet</p>
          <p className="text-sm text-charcoal/25">
            Collections help you organize your lyrics by theme, mood, or any way you like.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
