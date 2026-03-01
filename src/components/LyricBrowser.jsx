import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fetchSongLyrics } from '../lib/song-lyrics'

export default function LyricBrowser({ songTitle, artistName, onSelect, onClose }) {
  const [fullLyrics, setFullLyrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startLine, setStartLine] = useState(null)
  const [endLine, setEndLine] = useState(null)

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

  const lines = fullLyrics ? fullLyrics.split('\n') : []

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
      setStartLine(index)
      setEndLine(null)
    } else if (endLine === null) {
      setEndLine(index)
    } else {
      setStartLine(index)
      setEndLine(null)
    }
  }

  function handleUseSelected() {
    const text = getSelectedText()
    if (text) {
      onSelect(text)
      onClose()
    }
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
