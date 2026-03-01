import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFollow } from '../contexts/FollowContext'
import { supabase } from '../lib/supabase-wrapper'

export default function Following() {
  const { follows, unfollow, loading } = useFollow()
  const [collectionNames, setCollectionNames] = useState({})
  const [unfollowing, setUnfollowing] = useState(null)

  // Group follows by type
  const artists = follows.filter(f => f.filter_type === 'artist').sort((a, b) => a.filter_value.localeCompare(b.filter_value))
  const songs = follows.filter(f => f.filter_type === 'song').sort((a, b) => a.filter_value.localeCompare(b.filter_value))
  const tags = follows.filter(f => f.filter_type === 'tag').sort((a, b) => a.filter_value.localeCompare(b.filter_value))
  const collections = follows.filter(f => f.filter_type === 'collection').sort((a, b) => {
    const nameA = collectionNames[a.filter_value] || a.filter_value
    const nameB = collectionNames[b.filter_value] || b.filter_value
    return nameA.localeCompare(nameB)
  })

  // Fetch collection names
  useEffect(() => {
    if (collections.length === 0) return
    const ids = collections.map(f => f.filter_value)
    supabase
      .from('collections')
      .select('id, name')
      .in('id', ids)
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(c => { map[c.id] = c.name })
          setCollectionNames(map)
        }
      })
  }, [follows])

  async function handleUnfollow(filterType, filterValue) {
    const key = `${filterType}:${filterValue}`
    setUnfollowing(key)
    try {
      await unfollow(filterType, filterValue)
    } catch (err) {
      console.error('Error unfollowing:', err)
    } finally {
      setUnfollowing(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <p className="text-sm text-charcoal/30">Loading...</p>
      </div>
    )
  }

  const totalFollows = follows.length

  if (totalFollows === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase mb-8">following</h1>
        <div className="text-center py-16">
          <p
            className="text-xl mb-2"
            style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
          >
            not following anything
          </p>
          <p className="text-sm text-charcoal/30 mb-6">
            Follow artists, songs, and tags to build your feed
          </p>
          <Link
            to="/explore"
            className="px-6 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--text-primary, #2C2825)',
              color: 'var(--surface-bg, #FAF8F5)',
            }}
          >
            Explore
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase mb-8">following</h1>

      <div className="space-y-8">
        {/* Artists */}
        {artists.length > 0 && (
          <FollowSection
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            title="Artists"
            count={artists.length}
          >
            {artists.map(f => (
              <FollowRow
                key={f.id}
                label={f.filter_value}
                to={`/artist/${encodeURIComponent(f.filter_value.toLowerCase())}`}
                isUnfollowing={unfollowing === `artist:${f.filter_value}`}
                onUnfollow={() => handleUnfollow('artist', f.filter_value)}
              />
            ))}
          </FollowSection>
        )}

        {/* Songs */}
        {songs.length > 0 && (
          <FollowSection
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            }
            title="Songs"
            count={songs.length}
          >
            {songs.map(f => (
              <FollowRow
                key={f.id}
                label={`"${f.filter_value}"`}
                to={`/song/${encodeURIComponent(f.filter_value.toLowerCase())}`}
                isUnfollowing={unfollowing === `song:${f.filter_value}`}
                onUnfollow={() => handleUnfollow('song', f.filter_value)}
              />
            ))}
          </FollowSection>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <FollowSection
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            }
            title="Tags"
            count={tags.length}
          >
            {tags.map(f => (
              <FollowRow
                key={f.id}
                label={`#${f.filter_value}`}
                to={`/explore/tag/${encodeURIComponent(f.filter_value)}`}
                isUnfollowing={unfollowing === `tag:${f.filter_value}`}
                onUnfollow={() => handleUnfollow('tag', f.filter_value)}
              />
            ))}
          </FollowSection>
        )}

        {/* Collections */}
        {collections.length > 0 && (
          <FollowSection
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            }
            title="Collections"
            count={collections.length}
          >
            {collections.map(f => (
              <FollowRow
                key={f.id}
                label={collectionNames[f.filter_value] || 'Collection'}
                to={`/collections/${f.filter_value}`}
                isUnfollowing={unfollowing === `collection:${f.filter_value}`}
                onUnfollow={() => handleUnfollow('collection', f.filter_value)}
              />
            ))}
          </FollowSection>
        )}
      </div>
    </div>
  )
}

function FollowSection({ icon, title, count, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-charcoal/40">{icon}</span>
        <h2 className="text-sm font-light text-charcoal/40 lowercase tracking-wide">{title}</h2>
        <span className="text-xs text-charcoal/25">{count}</span>
      </div>
      <div
        style={{
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
          backgroundColor: 'var(--surface-card, #F5F2ED)',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function FollowRow({ label, to, isUnfollowing, onUnfollow }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
    >
      <Link
        to={to}
        className="text-sm hover:text-charcoal transition-colors truncate flex-1 min-w-0"
        style={{ color: 'var(--text-primary, #2C2825)' }}
      >
        {label}
      </Link>
      <button
        onClick={onUnfollow}
        disabled={isUnfollowing}
        className="ml-3 px-3 py-1 text-xs rounded-full transition-colors shrink-0"
        style={{
          border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          color: 'var(--text-secondary, #6B635A)',
          opacity: isUnfollowing ? 0.4 : 1,
        }}
      >
        Unfollow
      </button>
    </div>
  )
}
