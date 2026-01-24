import { Link } from 'react-router-dom'
import { useFollow } from '../contexts/FollowContext'

export default function Following() {
  const { follows, loading, unfollow } = useFollow()

  // Group follows by type
  const tags = follows.filter(f => f.filter_type === 'tag')
  const artists = follows.filter(f => f.filter_type === 'artist')
  const songs = follows.filter(f => f.filter_type === 'song')

  async function handleUnfollow(filterType, filterValue) {
    try {
      await unfollow(filterType, filterValue)
    } catch (err) {
      console.error('Error unfollowing:', err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <p className="text-sm text-charcoal-light/60">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase mb-8">
        following
      </h1>

      {follows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light/60 mb-2">
            You're not following anything yet
          </p>
          <p className="text-sm text-charcoal-light/40 mb-6">
            Follow tags, artists, or songs on Explore to see them here
          </p>
          <Link
            to="/explore"
            className="text-sm text-charcoal/60 hover:text-charcoal transition-colors"
          >
            Go to Explore →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tags */}
          {tags.length > 0 && (
            <section>
              <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-center gap-2 px-3 py-2 border border-charcoal/10 hover:border-charcoal/20 transition-colors"
                  >
                    <Link
                      to={`/explore/tag/${encodeURIComponent(f.filter_value)}`}
                      className="text-sm text-charcoal/70 hover:text-charcoal transition-colors"
                    >
                      #{f.filter_value}
                    </Link>
                    <button
                      onClick={() => handleUnfollow(f.filter_type, f.filter_value)}
                      className="text-charcoal/20 hover:text-charcoal/50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Unfollow"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {artists.length > 0 && (
            <section>
              <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-3">Artists</h2>
              <div className="space-y-2">
                {artists.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-center justify-between px-4 py-3 border border-charcoal/10 hover:border-charcoal/20 transition-colors"
                  >
                    <Link
                      to={`/explore/artist/${encodeURIComponent(f.filter_value)}`}
                      className="text-sm text-charcoal/70 hover:text-charcoal transition-colors"
                    >
                      {f.filter_value}
                    </Link>
                    <button
                      onClick={() => handleUnfollow(f.filter_type, f.filter_value)}
                      className="text-charcoal/20 hover:text-charcoal/50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Unfollow"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Songs */}
          {songs.length > 0 && (
            <section>
              <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-3">Songs</h2>
              <div className="space-y-2">
                {songs.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-center justify-between px-4 py-3 border border-charcoal/10 hover:border-charcoal/20 transition-colors"
                  >
                    <Link
                      to={`/explore/song/${encodeURIComponent(f.filter_value)}`}
                      className="text-sm text-charcoal/70 hover:text-charcoal transition-colors"
                    >
                      "{f.filter_value}"
                    </Link>
                    <button
                      onClick={() => handleUnfollow(f.filter_type, f.filter_value)}
                      className="text-charcoal/20 hover:text-charcoal/50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Unfollow"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
