import { useState, useRef, useEffect } from 'react'
import { themes } from '../lib/themes'
import { getPublicProfileUrl } from '../lib/utils'
import VisibilityToggle from './VisibilityToggle'

export default function ShareModal({ lyric, username, isPublic, onVisibilityChange, onClose }) {
  const [copied, setCopied] = useState(false)
  const [imageGenerated, setImageGenerated] = useState(false)
  const canvasRef = useRef(null)

  const profileUrl = getPublicProfileUrl(username)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const copyLink = async () => {
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for mobile Safari - use text selection
      try {
        const input = document.createElement('input')
        input.value = profileUrl
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
    const width = 1080
    const height = 1080

    canvas.width = width
    canvas.height = height

    // Background
    ctx.fillStyle = theme.backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Text settings
    ctx.textAlign = theme.textAlign === 'left' ? 'left' : 'center'
    ctx.textBaseline = 'middle'

    // Calculate font size for canvas (scale up from CSS rem)
    const baseFontSize = parseFloat(theme.fontSize) * 32

    // Draw lyric
    ctx.fillStyle = theme.textColor
    ctx.font = `${theme.fontStyle} ${theme.fontWeight} ${baseFontSize}px ${theme.fontFamily.split(',')[0].replace(/'/g, '')}`

    const x = theme.textAlign === 'left' ? 80 : width / 2
    const maxWidth = width - 160

    // Word wrap
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
    let startY = (height - totalTextHeight) / 2

    lines.forEach((line, i) => {
      ctx.fillText(line, x, startY + i * lineHeight + lineHeight / 2)
    })

    // Draw song/artist if present
    if (lyric.song_title || lyric.artist_name) {
      const secondaryFontSize = baseFontSize * 0.5
      ctx.fillStyle = theme.secondaryColor
      ctx.font = `normal 400 ${secondaryFontSize}px ${theme.fontFamily.split(',')[0].replace(/'/g, '')}`

      let secondaryText = ''
      if (lyric.song_title) secondaryText += lyric.song_title
      if (lyric.song_title && lyric.artist_name) secondaryText += ' — '
      if (lyric.artist_name) secondaryText += lyric.artist_name

      ctx.fillText(secondaryText, x, startY + totalTextHeight + 60)
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
    if (!canvas) return

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
              title: 'Earwyrm Lyric',
              text: 'Check out this lyric',
            })
            return
          }

          // Fallback: share just the URL if files aren't supported
          await navigator.share({
            title: 'Earwyrm Lyric',
            text: 'Check out this lyric',
            url: profileUrl,
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
            <div className="space-y-4">
            {/* Share Link */}
            <div>
              <h3 className="text-sm font-medium text-charcoal mb-2">Share link</h3>
              {!isPublic ? (
                <div className="text-sm text-charcoal-light">
                  <p className="mb-3">This lyric is private. Make it visible before sharing?</p>
                  <VisibilityToggle
                    isPublic={isPublic}
                    onChange={onVisibilityChange}
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={profileUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-cream-dark border border-charcoal/20
                             text-charcoal"
                  />
                  <button
                    onClick={copyLink}
                    className="px-4 py-2 text-sm border border-charcoal/30
                             hover:border-charcoal/60 transition-colors"
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
