import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { fetchSongLyrics } from '../lib/song-lyrics'

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

export default function LyricBrowser({ songTitle, artistName, currentContent = '', onSelect, onClose }) {
  const [fullLyrics, setFullLyrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startLine, setStartLine] = useState(null)
  const [endLine, setEndLine] = useState(null)

  const lines = useMemo(() => fullLyrics ? fullLyrics.split('\n') : [], [fullLyrics])

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

  // Restore selection from current content when lyrics load
  useEffect(() => {
    if (!fullLyrics || !currentContent.trim()) return
    const contentLines = currentContent.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (contentLines.length === 0) return

    const normalizedFirst = normalize(contentLines[0])
    const normalizedLast = normalize(contentLines[contentLines.length - 1])
    const lyricsLines = fullLyrics.split('\n')

    let foundStart = null
    let foundEnd = null

    for (let i = 0; i < lyricsLines.length; i++) {
      const nl = normalize(lyricsLines[i])
      if (nl.length < 3) continue
      if (foundStart === null && nl.includes(normalizedFirst)) foundStart = i
      if (nl.includes(normalizedLast)) foundEnd = i
    }

    if (foundStart !== null && foundEnd !== null) {
      setStartLine(foundStart)
      setEndLine(foundEnd)
    }
  }, [fullLyrics, currentContent])

  function getSelectedRange() {
    if (startLine === null) return null
    if (endLine === null) return [startLine, startLine]
    return [Math.min(startLine, endLine), Math.max(startLine, endLine)]
  }

  function isLineSelected(index) {
    const range = getSelectedRange()
    if (!range) return false
    return index >= range[0] && index <= range[1]
  }

  function getSelectedText() {
    const range = getSelectedRange()
    if (!range) return ''
    return lines
      .slice(range[0], range[1] + 1)
      .filter(l => l.trim() !== '')
      .join('\n')
  }

  function handleLineTap(index) {
    if (startLine === null) {
      // First tap: set start
      setStartLine(index)
      setEndLine(null)
    } else if (endLine === null) {
      // Second tap: set end
      setEndLine(index)
    } else {
      // Already have a range — adjust nearest endpoint
      const lo = Math.min(startLine, endLine)
      const hi = Math.max(startLine, endLine)
      const mid = Math.floor((lo + hi) / 2)

      if (index <= mid) {
        setStartLine(Math.min(index, hi))
        setEndLine(Math.max(index, hi))
      } else {
        setStartLine(lo)
        setEndLine(index)
      }
    }
  }

  function handleUseSelected() {
    const text = getSelectedText()
    if (text) {
      onSelect(text)
      onClose()
    }
  }

  function getInstructionText() {
    if (startLine === null) return 'tap a line to start selecting'
    if (endLine === null) return 'tap another line to complete your selection'
    return 'tap a line to adjust \u00b7 clear to start over'
  }

  const content = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl md:rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-bg, #FAF6F0)',
          color: 'var(--text-primary, #2C2825)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal/10">
          <button
            onClick={onClose}
            className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
          <span
            className="text-sm font-medium"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            browse lyrics
          </span>
          <div className="w-12" />
        </div>

        {/* Instruction bar */}
        <div
          className="px-4 py-2 text-center text-xs"
          style={{
            backgroundColor: 'var(--surface-card, #F5F2ED)',
            color: 'var(--text-muted, #9C948A)',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          {getInstructionText()}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-4 bg-charcoal/5 rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
              ))}
            </div>
          ) : !fullLyrics ? (
            <div className="text-center py-12">
              <p
                className="text-xl mb-2"
                style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
              >
                lyrics not available
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {lines.map((line, index) => {
                const isEmpty = line.trim() === ''
                const selected = isLineSelected(index)

                if (isEmpty) {
                  return <div key={index} className="h-4" />
                }

                return (
                  <p
                    key={index}
                    onClick={() => handleLineTap(index)}
                    className={`py-1 px-2 cursor-pointer select-none transition-colors ${
                      selected
                        ? 'bg-[#B8A99A]/15 border-l-2 border-[#B8A99A]'
                        : 'border-l-2 border-transparent hover:bg-charcoal/5'
                    }`}
                    style={{
                      fontFamily: "'Caveat', cursive",
                      fontSize: '1.125rem',
                      color: selected
                        ? 'var(--text-primary, #2C2825)'
                        : 'var(--text-secondary, #6B635A)',
                    }}
                  >
                    {line}
                  </p>
                )
              })}
            </div>
          )}
        </div>

        {/* Selection toolbar */}
        {startLine !== null && (
          <div
            className="px-4 py-3 border-t border-charcoal/10"
            style={{ backgroundColor: 'var(--surface-card, #F5F2ED)' }}
          >
            {getSelectedText() && (
              <p
                className="text-xs text-charcoal/50 mb-2 line-clamp-2"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {getSelectedText()}
              </p>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setStartLine(null); setEndLine(null) }}
                className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleUseSelected}
                disabled={!getSelectedText()}
                className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-all"
                style={{
                  backgroundColor: '#B8A99A',
                  opacity: getSelectedText() ? 1 : 0.3,
                }}
              >
                Use selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
