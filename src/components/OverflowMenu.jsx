import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function OverflowMenu({ isOwn, lyric, username, profileIsPublic, onEdit, onReplace }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const hasArtist = !!lyric.artist_name
  const hasSong = !!lyric.song_title
  const hasProfile = !!username && profileIsPublic !== false

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 text-charcoal/30 hover:text-charcoal/50 transition-colors"
        title="More"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-charcoal/10 shadow-lg z-50 min-w-[180px] py-1">
          {isOwn ? (
            <>
              <button
                onClick={() => { setOpen(false); onEdit?.() }}
                className="w-full text-left px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                Edit lyric
              </button>
              <button
                onClick={() => { setOpen(false); onReplace?.() }}
                className="w-full text-left px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                New version (replace)
              </button>
            </>
          ) : (
            <>
              {hasArtist ? (
                <Link
                  to={`/artist/${encodeURIComponent(lyric.artist_name.toLowerCase())}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
                >
                  Go to artist page
                </Link>
              ) : (
                <span className="block px-4 py-2 text-sm text-charcoal/20 cursor-default">
                  Go to artist page
                </span>
              )}
              {hasSong ? (
                <Link
                  to={`/song/${encodeURIComponent(lyric.song_title.toLowerCase())}${hasArtist ? `?artist=${encodeURIComponent(lyric.artist_name)}` : ''}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
                >
                  Go to song page
                </Link>
              ) : (
                <span className="block px-4 py-2 text-sm text-charcoal/20 cursor-default">
                  Go to song page
                </span>
              )}
              {hasProfile ? (
                <Link
                  to={`/u/${username}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
                >
                  Go to @{username}
                </Link>
              ) : (
                <span className="block px-4 py-2 text-sm text-charcoal/20 cursor-default">
                  Go to @user
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
