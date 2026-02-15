import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../contexts/CollectionContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'

function CollectionCard({ collection, lyricCount, index }) {
  return (
    <div
      className="flex-shrink-0 w-[240px] sm:w-[260px] carousel-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Link
        to={`/collections/${collection.id}`}
        className="block p-4 h-full"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08))',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        }}
      >
        <h3
          className="text-charcoal/70 mb-2 truncate"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '1.15rem' }}
        >
          {collection.name}
        </h3>

        {collection.description && (
          <p className="text-xs text-charcoal/30 line-clamp-2 mb-3">
            {collection.description}
          </p>
        )}

        <div
          className="flex items-center justify-between pt-2 mt-auto"
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
    </div>
  )
}

export default function CollectionsCarousel() {
  const { user } = useAuth()
  const { collections, loading: collectionsLoading } = useCollection()
  const [lyricCounts, setLyricCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCounts() {
      if (collectionsLoading || !collections || collections.length === 0) {
        setLoading(false)
        return
      }

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
              for (const col of smartCollections) {
                if (error) {
                  counts[col.id] = 0
                } else {
                  counts[col.id] = (data || []).filter(l =>
                    l.tags && l.tags.includes(col.smart_tag)
                  ).length
                }
              }
            })
        )
      }

      for (const col of manualCollections) {
        promises.push(
          supabase
            .from('lyric_collections')
            .select('id')
            .eq('collection_id', col.id)
            .then(({ data, error }) => {
              counts[col.id] = error ? 0 : (data?.length || 0)
            })
        )
      }

      await Promise.all(promises)
      setLyricCounts(counts)
      setLoading(false)
    }

    fetchCounts()
  }, [collections, collectionsLoading, user?.id])

  if (loading || collectionsLoading || !collections || collections.length === 0) return null

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-light text-charcoal/40 lowercase tracking-wide">
          your collections
        </h2>
        <Link
          to="/collections"
          className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
        >
          See all
        </Link>
      </div>

      <div
        className="-mx-4 px-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {collections.map((collection, i) => (
          <div key={collection.id} style={{ scrollSnapAlign: 'start' }}>
            <CollectionCard
              collection={collection}
              lyricCount={lyricCounts[collection.id] || 0}
              index={i}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
