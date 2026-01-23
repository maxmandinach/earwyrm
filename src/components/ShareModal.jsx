import { useState, useRef, useEffect } from 'react'
import { themes } from '../lib/themes'
import { layouts } from '../lib/layouts'
import { generateShareToken, getShareableUrl } from '../lib/utils'
import { supabase } from '../lib/supabase-wrapper'

export default function ShareModal({ lyric, username, isPublic, onVisibilityChange, onClose }) {
  const [copied, setCopied] = useState(false)
  const [imageGenerated, setImageGenerated] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef(null)

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const copyLink = async () => {
    if (!shareUrl) return

    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for mobile Safari - use text selection
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

  const generateImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const theme = themes[lyric.theme] || themes.default
    const layout = layouts[lyric.layout] || layouts.standard
    const config = layout.canvas
    const width = 1080
    const height = 1080

    canvas.width = width
    canvas.height = height

    // Background
    ctx.fillStyle = theme.backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Draw letterbox bars for cinematic layout
    if (config.letterbox) {
      ctx.fillStyle = '#000000'
      const barHeight = height * config.letterboxHeight
      ctx.fillRect(0, 0, width, barHeight)
      ctx.fillRect(0, height - barHeight, width, barHeight)
    }

    // Calculate font size for canvas (scale up from CSS rem, then apply layout scale)
    const baseFontSize = parseFloat(theme.fontSize) * 32 * config.lyricScale
    const fontFamily = theme.fontFamily.split(',')[0].replace(/'/g, '')

    // Get lyric content (apply transform if specified)
    let displayContent = lyric.content
    if (config.lyricTransform === 'uppercase') {
      displayContent = displayContent.toUpperCase()
    }

    // Text settings based on layout
    ctx.textAlign = config.lyricAlign
    ctx.textBaseline = 'middle'
    ctx.fillStyle = theme.textColor
    ctx.font = `${theme.fontStyle} ${theme.fontWeight} ${baseFontSize}px ${fontFamily}`

    // Calculate max width based on layout
    const padding = config.padding
    const maxWidth = width * config.lyricMaxWidth

    // Calculate X position based on alignment
    let x
    if (config.lyricAlign === 'left') {
      x = padding.left
    } else if (config.lyricAlign === 'right') {
      x = width - padding.right
    } else {
      x = width / 2
    }

    // Word wrap
    const words = displayContent.split(' ')
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

    // Calculate Y position based on layout
    let startY
    if (typeof config.lyricVertical === 'number') {
      // Percentage positioning
      startY = height * config.lyricVertical - totalTextHeight / 2
    } else if (config.lyricVertical === 'top') {
      startY = padding.top
    } else if (config.lyricVertical === 'bottom') {
      startY = height - padding.bottom - totalTextHeight
    } else {
      // center
      startY = (height - totalTextHeight) / 2
    }

    // Draw lyric lines
    lines.forEach((line, i) => {
      ctx.fillText(line, x, startY + i * lineHeight + lineHeight / 2)
    })

    // Draw song/artist if present
    if (lyric.song_title || lyric.artist_name) {
      let secondaryText = ''
      if (lyric.song_title) secondaryText += lyric.song_title
      if (lyric.song_title && lyric.artist_name) secondaryText += ' — '
      if (lyric.artist_name) secondaryText += lyric.artist_name

      if (config.attributionTransform === 'uppercase') {
        secondaryText = secondaryText.toUpperCase()
      }

      const secondaryFontSize = baseFontSize * config.attributionScale
      ctx.fillStyle = theme.secondaryColor
      ctx.font = `normal 400 ${secondaryFontSize}px ${fontFamily}`

      if (config.attributionPosition === 'right-vertical') {
        // Editorial layout: vertical text on right edge
        ctx.save()
        ctx.translate(width - 50, height / 2)
        ctx.rotate(Math.PI / 2)
        ctx.textAlign = 'center'
        ctx.fillText(secondaryText, 0, 0)
        ctx.restore()
      } else if (config.attributionPosition === 'bottom') {
        // Brutalist: at the bottom center
        ctx.textAlign = 'center'
        ctx.fillText(secondaryText, width / 2, height - padding.bottom)
      } else {
        // Default: below the lyric
        ctx.textAlign = config.attributionAlign
        const attrX = config.attributionAlign === 'left' ? padding.left :
                      config.attributionAlign === 'right' ? width - padding.right :
                      width / 2
        ctx.fillText(secondaryText, attrX, startY + totalTextHeight + config.lyricAttributionGap)
      }
    }

    // Draw branding at bottom
    const brandFontSize = 28
    ctx.fillStyle = theme.secondaryColor || theme.textColor
    ctx.globalAlpha = 0.5
    ctx.font = `normal 400 ${brandFontSize}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('earwyrm', width / 2, height - 40)
    ctx.globalAlpha = 1.0

    setImageGenerated(true)
  }

  const shareImage = async () => {
    const canvas = canvasRef.current
    if (!canvas || !shareUrl) return

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      // Try Web Share API (works on mobile with HTTPS)
      if (navigator.share) {
        try {
          const file = new File([blob], 'earwyrm-lyric.png', { type: 'image/png' })

          // Check if we can share files
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'earwyrm',
              text: "A lyric that's been on my mind — from earwyrm",
              url: shareUrl,
            })
            return
          }

          // Fallback: share just the URL if files aren't supported
          await navigator.share({
            title: 'earwyrm',
            text: "A lyric that's been on my mind — from earwyrm",
            url: shareUrl,
          })
          return
        } catch (err) {
          // User cancelled or share failed
          if (err.name !== 'AbortError') {
            console.log('Share failed:', err)
          }
        }
      }

      // Fallback to download for desktop
      const link = document.createElement('a')
      link.download = 'earwyrm-lyric.png'
      link.href = URL.createObjectURL(blob)
      link.click()
      URL.revokeObjectURL(link.href)
    }, 'image/png')
  }

  useEffect(() => {
    generateImage()
  }, [lyric])

  useEffect(() => {
    async function ensureShareToken() {
      try {
        // Check if lyric already has a share token
        if (lyric.share_token) {
          setShareUrl(getShareableUrl(lyric.share_token))
          setLoading(false)
          return
        }

        // Generate a new token
        const token = generateShareToken()

        // Update the lyric in the database
        const { error } = await supabase
          .from('lyrics')
          .update({ share_token: token })
          .eq('id', lyric.id)

        if (error) {
          console.error('Error updating share token:', error)
          setShareUrl('') // Fallback to no share URL
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/20">
        <div className="bg-cream w-full max-w-md flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-charcoal/10 flex justify-between items-center">
            <h2 className="text-lg font-medium text-charcoal">Share</h2>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-start gap-2 mb-4 pb-4 border-b border-charcoal/10">
              <span className="text-charcoal-light/60 text-sm">ℹ️</span>
              <p className="text-xs text-charcoal-light/60">
                Anyone with the link can view this lyric
              </p>
            </div>

            <div className="space-y-4">
            {/* Share Link */}
            <div>
              <h3 className="text-sm font-medium text-charcoal mb-2">Share link</h3>
              {loading ? (
                <div className="text-sm text-charcoal-light">
                  Generating shareable link...
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-cream-dark border border-charcoal/20
                             text-charcoal"
                  />
                  <button
                    onClick={copyLink}
                    disabled={!shareUrl}
                    className="px-4 py-2 text-sm border border-charcoal/30
                             hover:border-charcoal/60 transition-colors disabled:opacity-50"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

          {/* Share Image */}
          <div>
            <h3 className="text-sm font-medium text-charcoal mb-2">Share image</h3>
            <div
              className="bg-cream-dark p-2 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={shareImage}
            >
              <canvas
                ref={canvasRef}
                className="w-full aspect-square"
                style={{ display: imageGenerated ? 'block' : 'none' }}
              />
            </div>
            <button
              onClick={shareImage}
              className="mt-3 w-full py-2 text-sm border border-charcoal/30
                       hover:border-charcoal/60 transition-colors"
            >
              {isMobile ? 'Share image' : 'Download image'}
            </button>
          </div>
            </div>
          </div>
        </div>
      </div>
  )
}
