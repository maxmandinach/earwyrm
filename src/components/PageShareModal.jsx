import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { signatureStyle, darkVariant } from '../lib/themes'
import { applyPaperTextureToCanvas, applyDarkPaperTexture } from '../lib/paperTexture'

const FORMATS = {
  square: { width: 1080, height: 1080 },
  tall: { width: 1080, height: 1920 },
}

function drawPaperTexture(ctx, width, height, isDark) {
  if (isDark) {
    applyDarkPaperTexture(ctx, width, height, { seed: 42 })
  } else {
    applyPaperTextureToCanvas(ctx, width, height, { seed: 42 })
  }
  ctx.strokeStyle = isDark ? '#4A4540' : '#D4CFC4'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, width - 2, height - 2)
}

function getInitialDarkMode() {
  const stored = localStorage.getItem('earwyrm-theme')
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

// Binary search for max font size that fits within maxWidth
function fitFontSize(ctx, text, fontFamily, minSize, maxSize, maxWidth) {
  let lo = minSize, hi = maxSize
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    ctx.font = `600 ${mid}px ${fontFamily}`
    if (ctx.measureText(text).width <= maxWidth) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return lo
}

// Wrap text to fit width, return array of lines
function wrapText(ctx, text, maxWidth, maxLines) {
  const words = text.split(' ')
  const lines = []
  let currentLine = words[0] || ''

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i]
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine
    } else {
      lines.push(currentLine)
      currentLine = words[i]
      if (lines.length >= maxLines) {
        // Truncate remaining
        const lastLine = lines[lines.length - 1]
        if (ctx.measureText(lastLine + '...').width <= maxWidth) {
          lines[lines.length - 1] = lastLine + '...'
        }
        return lines
      }
    }
  }
  lines.push(currentLine)

  // Truncate last line if we exceeded maxLines
  if (lines.length > maxLines) {
    lines.length = maxLines
    let last = lines[maxLines - 1]
    while (ctx.measureText(last + '...').width > maxWidth && last.length > 0) {
      last = last.slice(0, -1)
    }
    lines[maxLines - 1] = last + '...'
  }

  return lines
}

export default function PageShareModal({
  pageTitle,
  pageSubtitle,
  statsLine,
  featuredLyric,
  coverArtUrl,
  shareUrl,
  shareText,
  onClose,
}) {
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode)
  const [shareStyle, setShareStyle] = useState('minimal') // 'minimal' | 'coverArt'
  const [selectedFormat, setSelectedFormat] = useState('square')
  const [coverArtImg, setCoverArtImg] = useState(null)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [visible, setVisible] = useState(false)
  const canvasRef = useRef(null)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Load cover art
  useEffect(() => {
    if (!coverArtUrl) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setCoverArtImg(img)
    img.onerror = () => setCoverArtImg(null)
    img.src = coverArtUrl
  }, [coverArtUrl])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  function generateImage(format) {
    const canvas = canvasRef.current
    if (!canvas) return null

    const ctx = canvas.getContext('2d')
    const colors = isDarkMode ? darkVariant : signatureStyle
    const { width, height } = FORMATS[format]

    canvas.width = width
    canvas.height = height

    drawPaperTexture(ctx, width, height, isDarkMode)

    // Cover art background
    if (shareStyle === 'coverArt' && coverArtImg) {
      ctx.save()
      ctx.globalAlpha = 0.08
      const imgAspect = coverArtImg.width / coverArtImg.height
      const canvasAspect = width / height
      let sx = 0, sy = 0, sw = coverArtImg.width, sh = coverArtImg.height
      if (imgAspect > canvasAspect) {
        sw = coverArtImg.height * canvasAspect
        sx = (coverArtImg.width - sw) / 2
      } else {
        sh = coverArtImg.width / canvasAspect
        sy = (coverArtImg.height - sh) / 2
      }
      ctx.drawImage(coverArtImg, sx, sy, sw, sh, 0, 0, width, height)
      ctx.globalAlpha = 1.0
      ctx.restore()
    }

    const isTall = format === 'tall'
    const scale = isTall ? 1.2 : 1
    const marginX = 120
    const maxWidth = width - marginX * 2

    // --- Title ---
    const titleFont = "'Caveat', cursive"
    const titleSize = fitFontSize(ctx, pageTitle, titleFont, 48 * scale, 96 * scale, maxWidth)
    ctx.font = `600 ${titleSize}px ${titleFont}`

    const contentStartY = isTall ? height * 0.32 : height * 0.28
    let y = contentStartY

    ctx.fillStyle = colors.textColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(pageTitle, marginX, y)
    y += titleSize * 1.2

    // --- Subtitle ---
    if (pageSubtitle) {
      const subtitleSize = Math.round(28 * scale)
      ctx.font = `400 ${subtitleSize}px "DM Sans", system-ui, sans-serif`
      ctx.fillStyle = colors.secondaryColor
      ctx.fillText(pageSubtitle, marginX, y)
      y += subtitleSize * 1.5
    }

    // --- Taupe rule ---
    y += 20
    ctx.strokeStyle = colors.accentColor || colors.secondaryColor
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(marginX, y)
    ctx.lineTo(marginX + 80, y)
    ctx.stroke()
    ctx.globalAlpha = 1.0
    y += 40

    // --- Stats line ---
    if (statsLine) {
      const statsSize = Math.round(24 * scale)
      ctx.font = `400 ${statsSize}px "DM Sans", system-ui, sans-serif`
      ctx.fillStyle = colors.secondaryColor
      ctx.globalAlpha = isDarkMode ? 0.8 : 0.7
      ctx.fillText(statsLine, marginX, y)
      ctx.globalAlpha = 1.0
      y += statsSize * 2
    }

    // --- Featured lyric ---
    if (featuredLyric) {
      const lyricSize = Math.round(36 * scale)
      ctx.font = `500 ${lyricSize}px "Caveat", cursive`

      // Truncate to ~120 chars
      let lyricText = featuredLyric
      if (lyricText.length > 120) {
        lyricText = lyricText.slice(0, 117) + '...'
      }
      lyricText = `\u201C${lyricText}\u201D`

      const lyricLines = wrapText(ctx, lyricText, maxWidth, 3)
      ctx.fillStyle = colors.textColor
      ctx.globalAlpha = isDarkMode ? 0.7 : 0.5

      for (const line of lyricLines) {
        ctx.fillText(line, marginX, y)
        y += lyricSize * 1.4
      }
      ctx.globalAlpha = 1.0
    }

    // --- Brand footer ---
    const brandY = height - 70
    const brandFontSize = 26 * scale
    ctx.textAlign = 'center'
    ctx.font = `600 ${brandFontSize}px "DM Sans", system-ui, sans-serif`
    ctx.fillStyle = colors.secondaryColor
    ctx.globalAlpha = isDarkMode ? 0.85 : 0.65
    ctx.fillText('earwyrm', width / 2, brandY + 5)
    ctx.globalAlpha = 1.0
    ctx.textAlign = 'left'

    return canvas
  }

  async function handleShare() {
    const canvas = generateImage(selectedFormat)
    if (!canvas) return

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `earwyrm-${selectedFormat}.png`, { type: 'image/png' })

      if (navigator.share) {
        const shareData = {
          files: [file],
          text: shareText || `${pageTitle} on earwyrm\n${shareUrl || window.location.href}`,
        }

        if (navigator.canShare?.(shareData)) {
          try {
            await navigator.share(shareData)
            setShared(true)
            setTimeout(() => setShared(false), 2000)
            return
          } catch (err) {
            if (err.name === 'AbortError') return
          }
        }

        const imageOnly = { files: [file] }
        if (navigator.canShare?.(imageOnly)) {
          try {
            await navigator.share(imageOnly)
            setShared(true)
            setTimeout(() => setShared(false), 2000)
            return
          } catch (err) {
            if (err.name === 'AbortError') return
          }
        }
      }

      // Fallback: download
      const link = document.createElement('a')
      link.download = `earwyrm-${selectedFormat}.png`
      link.href = URL.createObjectURL(blob)
      link.click()
      URL.revokeObjectURL(link.href)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }, 'image/png')
  }

  async function handleCopyLink() {
    const url = shareUrl || window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = url
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Re-render canvas when settings change
  useEffect(() => {
    generateImage(selectedFormat)
  }, [pageTitle, pageSubtitle, statsLine, featuredLyric, isDarkMode, shareStyle, coverArtImg, selectedFormat])

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center transition-opacity duration-250"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${visible ? 0.5 : 0})`,
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-sm rounded-t-2xl md:rounded-lg transition-all duration-250 ease-out"
        style={{
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(2rem)',
        }}
      >
        {/* Drag handle - mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-charcoal/20" />
        </div>

        {/* Header */}
        <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1rem',
              color: 'var(--text-secondary, #6B635A)',
            }}
          >
            Share
          </h2>
          <button
            onClick={handleClose}
            className="py-2 px-3 text-sm"
            style={{ color: 'var(--text-secondary, #6B635A)' }}
          >
            Cancel
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 1.5rem 1.5rem' }}>
          {/* Preview */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <canvas
              ref={canvasRef}
              style={{
                height: selectedFormat === 'tall' ? '20rem' : '14rem',
                aspectRatio: selectedFormat === 'tall' ? '9/16' : '1/1',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                transition: 'all 0.3s ease-out',
              }}
            />
          </div>

          {/* Format + dark mode toggle */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', border: '1px solid var(--border-medium, rgba(0,0,0,0.1))', borderRadius: '4px', overflow: 'hidden' }}>
                <button
                  onClick={() => setSelectedFormat('square')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    fontSize: '0.875rem',
                    backgroundColor: selectedFormat === 'square' ? 'var(--text-primary, #2C2825)' : 'transparent',
                    color: selectedFormat === 'square' ? 'var(--surface-bg, #F5F2ED)' : 'var(--text-secondary, #6B635A)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Square
                </button>
                <button
                  onClick={() => setSelectedFormat('tall')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    fontSize: '0.875rem',
                    backgroundColor: selectedFormat === 'tall' ? 'var(--text-primary, #2C2825)' : 'transparent',
                    color: selectedFormat === 'tall' ? 'var(--surface-bg, #F5F2ED)' : 'var(--text-secondary, #6B635A)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Story
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                width: '3rem',
                padding: '0.625rem',
                fontSize: '0.875rem',
                backgroundColor: isDarkMode ? 'var(--text-primary, #2C2825)' : 'transparent',
                color: isDarkMode ? 'var(--surface-bg, #F5F2ED)' : 'var(--text-secondary, #6B635A)',
                border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? '◐' : '○'}
            </button>
          </div>

          {/* Style toggle — only when cover art is available */}
          {coverArtUrl && coverArtImg && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', border: '1px solid var(--border-medium, rgba(0,0,0,0.1))', borderRadius: '4px', overflow: 'hidden' }}>
                <button
                  onClick={() => setShareStyle('minimal')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    backgroundColor: shareStyle === 'minimal' ? 'var(--text-primary, #2C2825)' : 'transparent',
                    color: shareStyle === 'minimal' ? 'var(--surface-bg, #F5F2ED)' : 'var(--text-secondary, #6B635A)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Minimal
                </button>
                <button
                  onClick={() => setShareStyle('coverArt')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    backgroundColor: shareStyle === 'coverArt' ? 'var(--text-primary, #2C2825)' : 'transparent',
                    color: shareStyle === 'coverArt' ? 'var(--surface-bg, #F5F2ED)' : 'var(--text-secondary, #6B635A)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cover Art
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={handleShare}
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                backgroundColor: 'var(--text-primary, #2C2825)',
                color: 'var(--surface-bg, #F5F2ED)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {shared ? 'Shared' : 'Share image'}
            </button>
          </div>

          <button
            onClick={handleCopyLink}
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.625rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #6B635A)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
