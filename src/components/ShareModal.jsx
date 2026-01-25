import { useState, useRef, useEffect } from 'react'
import { signatureStyle } from '../lib/themes'
import { generateShareToken, getShareableUrl } from '../lib/utils'
import { supabase } from '../lib/supabase-wrapper'

const FORMATS = {
  story: { width: 1080, height: 1920, name: 'Story' },
  post: { width: 1080, height: 1080, name: 'Post' },
}

export default function ShareModal({ lyric, note, username, isPublic, onVisibilityChange, onClose }) {
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [includeNote, setIncludeNote] = useState(true)
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

    // Scale font based on format (larger for story)
    const scale = format === 'story' ? 1.15 : 1
    const baseFontSize = parseFloat(theme.fontSize) * 32 * scale

    // Calculate vertical positioning
    const isStory = format === 'story'
    const contentY = isStory ? height * 0.4 : height * 0.45

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
      const noteY = isStory ? height * 0.68 : attributionY + 40
      const noteFontSize = baseFontSize * 0.55
      const noteMaxWidth = width - 200

      ctx.fillStyle = theme.secondaryColor
      ctx.globalAlpha = 0.7
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

    // Draw branding at bottom
    const brandFontSize = 24 * scale
    ctx.fillStyle = theme.secondaryColor || theme.textColor
    ctx.globalAlpha = 0.4
    ctx.font = `normal 400 ${brandFontSize}px system-ui, -apple-system, sans-serif`
    ctx.fillText('earwyrm', width / 2, height - 50)
    ctx.globalAlpha = 1.0

    return canvas
  }

  const shareToDestination = async (format) => {
    const canvas = generateImage(format)
    if (!canvas) return

    canvas.toBlob(async (blob) => {
      if (navigator.share && isMobile) {
        try {
          const file = new File([blob], `earwyrm-${format}.png`, { type: 'image/png' })

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
            })
            return
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.log('Share failed:', err)
          }
        }
      }

      // Fallback to download
      const link = document.createElement('a')
      link.download = `earwyrm-${format}.png`
      link.href = URL.createObjectURL(blob)
      link.click()
      URL.revokeObjectURL(link.href)
    }, 'image/png')
  }

  useEffect(() => {
    // Generate preview (post format)
    generateImage('post')
  }, [lyric, note, includeNote])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/30">
      <div className="bg-cream w-full max-w-sm flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-sm font-medium text-charcoal/60 lowercase tracking-wide">share</h2>
          <button
            onClick={onClose}
            className="text-charcoal/40 hover:text-charcoal transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 pb-4">
          {/* Preview */}
          <div className="border border-charcoal/10">
            <canvas
              ref={canvasRef}
              className="w-full aspect-square"
            />
          </div>

          {/* Include note toggle */}
          {hasNote && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNote}
                onChange={(e) => setIncludeNote(e.target.checked)}
                className="w-4 h-4 accent-charcoal"
              />
              <span className="text-sm text-charcoal/60">Include my note</span>
            </label>
          )}

          {/* Destination buttons */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {/* Instagram Story */}
            <button
              onClick={() => shareToDestination('story')}
              className="flex flex-col items-center gap-1.5 py-3 border border-charcoal/10
                       hover:border-charcoal/30 hover:bg-charcoal/5 transition-colors rounded"
              title="Instagram Story (9:16)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
              </svg>
              <span className="text-xs text-charcoal/60">Story</span>
            </button>

            {/* Instagram Post */}
            <button
              onClick={() => shareToDestination('post')}
              className="flex flex-col items-center gap-1.5 py-3 border border-charcoal/10
                       hover:border-charcoal/30 hover:bg-charcoal/5 transition-colors rounded"
              title="Instagram Post (1:1)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
              </svg>
              <span className="text-xs text-charcoal/60">Post</span>
            </button>

            {/* X/Twitter */}
            <button
              onClick={() => shareToDestination('post')}
              className="flex flex-col items-center gap-1.5 py-3 border border-charcoal/10
                       hover:border-charcoal/30 hover:bg-charcoal/5 transition-colors rounded"
              title="X / Twitter (1:1)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="text-xs text-charcoal/60">X</span>
            </button>

            {/* Messages/More */}
            <button
              onClick={copyLink}
              disabled={loading || !shareUrl}
              className="flex flex-col items-center gap-1.5 py-3 border border-charcoal/10
                       hover:border-charcoal/30 hover:bg-charcoal/5 transition-colors rounded
                       disabled:opacity-50"
              title="Copy link"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span className="text-xs text-charcoal/60">{copied ? 'Copied!' : 'Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
