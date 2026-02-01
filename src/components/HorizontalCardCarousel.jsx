import { Link } from 'react-router-dom'
import useRevealOnScroll from '../hooks/useRevealOnScroll'

/**
 * Compact lyric card for horizontal carousels.
 * Shows lyric snippet, song/artist, and reaction count.
 */
function CompactCard({ lyric }) {
  const { ref, revealed } = useRevealOnScroll({ threshold: 0.1 })

  return (
    <div
      ref={ref}
      className="flex-shrink-0 w-[260px] sm:w-[280px]"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
      }}
    >
      <Link
        to={lyric.share_token ? `/l/${lyric.share_token}` : `/song/${encodeURIComponent((lyric.song_title || '').toLowerCase())}`}
        className="block p-5 h-full"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.06)',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        }}
      >
        {/* Lyric snippet — 3 lines max */}
        <p
          className="text-charcoal/80 leading-relaxed mb-3 line-clamp-3"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '1.1rem' }}
        >
          {lyric.content}
        </p>

        {/* Attribution */}
        {(lyric.song_title || lyric.artist_name) && (
          <p className="text-xs text-charcoal/40 italic truncate">
            {lyric.song_title}
            {lyric.song_title && lyric.artist_name && ' — '}
            {lyric.artist_name}
          </p>
        )}

        {/* Reaction count */}
        {(lyric.reaction_count || 0) > 0 && (
          <div className="flex items-center gap-1 mt-2 text-charcoal/25">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
              <line x1="4" y1="15" x2="4" y2="9" stroke="currentColor" strokeWidth="2" />
              <line x1="8" y1="17" x2="8" y2="7" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" strokeWidth="2" />
              <line x1="16" y1="17" x2="16" y2="7" stroke="currentColor" strokeWidth="2" />
              <line x1="20" y1="15" x2="20" y2="9" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-xs">{lyric.reaction_count}</span>
          </div>
        )}
      </Link>
    </div>
  )
}

/**
 * Horizontal scrolling carousel of compact lyric cards.
 * Props: title, lyrics[], linkTo (optional "see all" URL), linkLabel
 */
export default function HorizontalCardCarousel({ title, lyrics, linkTo, linkLabel = 'See all →' }) {
  if (!lyrics || lyrics.length === 0) return null

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors">
            {linkLabel}
          </Link>
        )}
      </div>

      {/* Horizontal scroll — bleeds past container edges on mobile */}
      <div
        className="-mx-4 px-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {lyrics.map((lyric) => (
          <div key={lyric.id} style={{ scrollSnapAlign: 'start' }}>
            <CompactCard lyric={lyric} />
          </div>
        ))}
      </div>
    </div>
  )
}
