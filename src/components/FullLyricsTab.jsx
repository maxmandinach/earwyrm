import { useState, useEffect, useMemo } from 'react'
import { fetchSongLyrics } from '../lib/song-lyrics'

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function FullLyricsTab({ songTitle, artistName, lyrics = [], onLineClick }) {
  const [fullLyrics, setFullLyrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const result = await fetchSongLyrics(songTitle, artistName)
      if (!cancelled) {
        setFullLyrics(result)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [songTitle, artistName])

  const highlightedLines = useMemo(() => {
    if (!fullLyrics) return new Set()
    const lines = fullLyrics.split('\n')
    const savedNormalized = lyrics.map(l => normalize(l.content))
    const highlighted = new Set()

    lines.forEach((line, index) => {
      const normalizedLine = normalize(line)
      if (normalizedLine.length < 3) return
      for (const saved of savedNormalized) {
        if (saved.includes(normalizedLine) || normalizedLine.includes(saved)) {
          highlighted.add(index)
          break
        }
      }
    })
    return highlighted
  }, [fullLyrics, lyrics])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-4 bg-charcoal/5 rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
        ))}
      </div>
    )
  }

  if (!fullLyrics) {
    return (
      <div className="text-center py-16">
        <p
          className="text-xl mb-2"
          style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
        >
          lyrics not available
        </p>
        <p className="text-sm text-charcoal/30">
          we couldn't find full lyrics for this song
        </p>
      </div>
    )
  }

  const lines = fullLyrics.split('\n')

  return (
    <div>
      <div className="space-y-0">
        {lines.map((line, index) => {
          const isEmpty = line.trim() === ''
          const isHighlighted = highlightedLines.has(index)

          if (isEmpty) {
            return <div key={index} className="h-4" />
          }

          return (
            <p
              key={index}
              onClick={isHighlighted && onLineClick ? onLineClick : undefined}
              className={`py-1 px-2 transition-colors ${
                isHighlighted
                  ? 'bg-[#B8A99A]/12 border-l-2 border-[#B8A99A] cursor-pointer hover:bg-[#B8A99A]/20'
                  : 'border-l-2 border-transparent'
              }`}
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: '1.125rem',
                color: isHighlighted
                  ? 'var(--text-primary, #2C2825)'
                  : 'var(--text-secondary, #6B635A)',
              }}
            >
              {line}
            </p>
          )
        })}
      </div>

      {/* Attribution */}
      <div className="text-center mt-8 space-y-1">
        <p className="text-xs text-charcoal/30">
          lyrics from{' '}
          <a
            href="https://lrclib.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#B8A99A] hover:underline"
          >
            lrclib
          </a>
        </p>
        <p className="text-[10px] text-charcoal/20">
          <a
            href="mailto:hello@earwyrm.app?subject=Lyrics%20inquiry"
            className="hover:text-charcoal/40 transition-colors"
          >
            issue with these lyrics?
          </a>
        </p>
      </div>
    </div>
  )
}
