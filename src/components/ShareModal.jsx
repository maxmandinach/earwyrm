import { useState, useRef, useEffect } from 'react'
import { signatureStyle } from '../lib/themes'
import { generateShareToken, getShareableUrl } from '../lib/utils'
import { supabase } from '../lib/supabase-wrapper'

const FORMATS = {
  square: { width: 1080, height: 1080, label: 'Square', hint: '1:1' },
  tall: { width: 1080, height: 1920, label: 'Tall', hint: '9:16' },
}

// Helper to format relative time
function formatTimeAgo(date) {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now - then
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Saved just now'
  if (diffHours < 24) return `Saved ${diffHours}h ago`
  if (diffDays < 7) return `Saved ${diffDays}d ago`
  return `Saved ${then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export default function ShareModal({ lyric, note, username, isPublic, onVisibilityChange, onClose }) {
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [includeNote, setIncludeNote] = useState(true)
  const [selectedFormat, setSelectedFormat] = useState('square')
  const canvasRef = useRef(null)

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const hasNote = note?.content?.trim()

  const copyLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for mobile Safari
      try {
        const input = document.createElement('input')
        input.value = shareUrl
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        input.setSelectionRange(0, 99999)
        document.execCommand('copy')
        document.body.removeChild(input)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        console.error('Failed to copy:', fallbackErr)
      }
    }
  }

  const generateImage = (format) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const ctx = canvas.getContext('2d')
    const theme = signatureStyle
    const { width, height } = FORMATS[format]

    canvas.width = width
    canvas.height = height

    // Background
    ctx.fillStyle = theme.backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Text settings
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Scale font based on format
    const scale = format === 'tall' ? 1.15 : 1
    const baseFontSize = parseFloat(theme.fontSize) * 32 * scale

    // Calculate vertical positioning
    const isTall = format === 'tall'
    const contentY = isTall ? height * 0.38 : height * 0.45

    // Draw lyric
    ctx.fillStyle = theme.textColor
    ctx.font = `${theme.fontStyle} ${theme.fontWeight} ${baseFontSize}px ${theme.fontFamily.split(',')[0].replace(/'/g, '')}`

    const maxWidth = width - 160
    const words = lyric.content.split(' ')
    const lines = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    lines.push(currentLine)

    const lineHeight = baseFontSize * parseFloat(theme.lineHeight)
    const totalTextHeight = lines.length * lineHeight
    let startY = contentY - totalTextHeight / 2

    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight + lineHeight / 2)
    })

    // Draw song/artist if present
    let attributionY = startY + totalTextHeight + 50
    if (lyric.song_title || lyric.artist_name) {
      const secondaryFontSize = baseFontSize * 0.45
      ctx.fillStyle = theme.secondaryColor
      ctx.font = `normal 400 ${secondaryFontSize}px ${theme.fontFamily.split(',')[0].replace(/'/g, '')}`

      let secondaryText = ''
      if (lyric.song_title) secondaryText += lyric.song_title
      if (lyric.song_title && lyric.artist_name) secondaryText += ' — '
      if (lyric.artist_name) secondaryText += lyric.artist_name

      ctx.fillText(secondaryText, width / 2, attributionY)
      attributionY += 60
    }

    // Draw note if included and present
    if (includeNote && hasNote) {
      const noteY = isTall ? height * 0.65 : attributionY + 40
      const noteFontSize = baseFontSize * 0.5
      const noteMaxWidth = width - 200

      ctx.fillStyle = theme.secondaryColor
      ctx.globalAlpha = 0.6
      ctx.font = `italic 400 ${noteFontSize}px ${theme.fontFamily.split(',')[0].replace(/'/g, '')}`

      // Word wrap the note
      const noteWords = note.content.split(' ')
      const noteLines = []
      let noteLine = ''

      for (const word of noteWords) {
        const testLine = noteLine ? `${noteLine} ${word}` : word
        const metrics = ctx.measureText(testLine)

        if (metrics.width > noteMaxWidth && noteLine) {
          noteLines.push(noteLine)
          noteLine = word
        } else {
          noteLine = testLine
        }
      }
      noteLines.push(noteLine)

      const noteLineHeight = noteFontSize * 1.4
      noteLines.forEach((line, i) => {
        ctx.fillText(`"${line}${i === noteLines.length - 1 ? '"' : ''}`, width / 2, noteY + i * noteLineHeight)
      })
      ctx.globalAlpha = 1.0
    }

    // Draw timestamp (subtle, bottom area)
    if (lyric.created_at) {
      const timestampFontSize = 20 * scale
      ctx.fillStyle = theme.secondaryColor || theme.textColor
      ctx.globalAlpha = 0.3
      ctx.font = `normal 400 ${timestampFontSize}px system-ui, -apple-system, sans-serif`
      ctx.fillText(formatTimeAgo(lyric.created_at), width / 2, height - 80)
      ctx.globalAlpha = 1.0
    }

    // Draw branding at bottom
    const brandFontSize = 22 * scale
    ctx.fillStyle = theme.secondaryColor || theme.textColor
    ctx.globalAlpha = 0.35
    ctx.font = `normal 400 ${brandFontSize}px system-ui, -apple-system, sans-serif`
    ctx.fillText('earwyrm', width / 2, height - 45)
    ctx.globalAlpha = 1.0

    return canvas
  }

  const shareImage = async () => {
    const canvas = generateImage(selectedFormat)
    if (!canvas) return

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `earwyrm-${selectedFormat}.png`, { type: 'image/png' })

      // On mobile with share support, use native share
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.log('Share failed:', err)
          }
        }
        return
      }

      // Desktop or no share support - download
      const link = document.createElement('a')
      link.download = `earwyrm-${selectedFormat}.png`
      link.href = URL.createObjectURL(blob)
      link.click()
      URL.revokeObjectURL(link.href)
    }, 'image/png')
  }

  useEffect(() => {
    generateImage(selectedFormat)
  }, [lyric, note, includeNote, selectedFormat])

  useEffect(() => {
    async function ensureShareToken() {
      try {
        if (lyric.share_token) {
          setShareUrl(getShareableUrl(lyric.share_token))
          setLoading(false)
          return
        }

        const token = generateShareToken()
        const { error } = await supabase
          .from('lyrics')
          .update({ share_token: token })
          .eq('id', lyric.id)

        if (error) {
          console.error('Error updating share token:', error)
          setShareUrl('')
        } else {
          setShareUrl(getShareableUrl(token))
        }
      } catch (err) {
        console.error('Error ensuring share token:', err)
        setShareUrl('')
      } finally {
        setLoading(false)
      }
    }

    ensureShareToken()
  }, [lyric])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/25">
      <div className="bg-cream w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-center">
          <h2
            className="text-base text-charcoal/70"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Share this moment
          </h2>
          <button
            onClick={onClose}
            className="text-charcoal/30 hover:text-charcoal/60 transition-colors p-1 -mr-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          {/* Preview - Hero */}
          <div className="flex justify-center">
            <div
              className="bg-white shadow-sm transition-all duration-300 ease-out"
              style={{
                padding: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
              }}
            >
              <canvas
                ref={canvasRef}
                className={`transition-all duration-300 ease-out ${
                  selectedFormat === 'tall' ? 'h-72 aspect-[9/16]' : 'h-52 aspect-square'
                }`}
              />
            </div>
          </div>

          {/* Preview caption */}
          <p className="text-center text-xs text-charcoal/30 mt-3">
            {hasNote && includeNote ? 'Your note will be included.' : 'Lyric only.'}
          </p>

          {/* Format selector */}
          <div className="mt-6">
            <div className="flex rounded border border-charcoal/15 overflow-hidden">
              <button
                onClick={() => setSelectedFormat('square')}
                className={`flex-1 py-2.5 text-sm transition-colors ${
                  selectedFormat === 'square'
                    ? 'bg-charcoal text-cream'
                    : 'text-charcoal/50 hover:bg-charcoal/5'
                }`}
              >
                Square
              </button>
              <button
                onClick={() => setSelectedFormat('tall')}
                className={`flex-1 py-2.5 text-sm transition-colors ${
                  selectedFormat === 'tall'
                    ? 'bg-charcoal text-cream'
                    : 'text-charcoal/50 hover:bg-charcoal/5'
                }`}
              >
                Tall
              </button>
            </div>
            <div className="flex mt-1.5">
              <span className="flex-1 text-center text-xs text-charcoal/30">1:1</span>
              <span className="flex-1 text-center text-xs text-charcoal/30">9:16</span>
            </div>
          </div>

          {/* Note toggle */}
          {hasNote ? (
            <label className="flex items-start gap-3 mt-6 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeNote}
                onChange={(e) => setIncludeNote(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-charcoal cursor-pointer"
              />
              <div>
                <span className="text-sm text-charcoal/70 group-hover:text-charcoal transition-colors">
                  Include my note
                </span>
                <p className="text-xs text-charcoal/40 mt-0.5">
                  Adds your words beneath the lyric.
                </p>
              </div>
            </label>
          ) : (
            <p className="mt-6 text-xs text-charcoal/40 text-center">
              <button
                onClick={onClose}
                className="text-charcoal/50 hover:text-charcoal/70 transition-colors underline underline-offset-2"
              >
                Add a note
              </button>
              {' '}to include your thoughts.
            </p>
          )}

          {/* Primary action */}
          <button
            onClick={shareImage}
            className="w-full mt-6 py-3 text-sm font-medium text-cream bg-charcoal
                     hover:bg-charcoal/90 active:bg-charcoal transition-colors"
          >
            {isMobile ? 'Share image' : 'Download image'}
          </button>

          {/* Secondary action */}
          <button
            onClick={copyLink}
            disabled={loading || !shareUrl}
            className="w-full mt-2 py-2 text-sm text-charcoal/50 hover:text-charcoal/70
                     transition-colors disabled:opacity-40"
          >
            {loading ? 'Generating link...' : copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  )
}
