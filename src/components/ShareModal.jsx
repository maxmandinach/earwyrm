import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { signatureStyle, darkVariant } from '../lib/themes'
import { generateShareToken, getShareableUrl } from '../lib/utils'
import { supabase } from '../lib/supabase-wrapper'
import { applyPaperTextureToCanvas, applyDarkPaperTexture } from '../lib/paperTexture'

const FORMATS = {
  square: { width: 1080, height: 1080, label: 'Square', hint: '1:1' },
  tall: { width: 1080, height: 1920, label: 'Tall', hint: '9:16' },
}

// Draw paper texture with optional border
function drawPaperTexture(ctx, width, height, isDark) {
  // Use the sophisticated procedural texture
  if (isDark) {
    applyDarkPaperTexture(ctx, width, height, { seed: 42 })
  } else {
    applyPaperTextureToCanvas(ctx, width, height, { seed: 42 })
  }

  // Thin border for edge definition
  ctx.strokeStyle = isDark ? '#4A4540' : '#D4CFC4'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, width - 2, height - 2)
}

// Words that should never start a line (they belong with the previous word)
const NO_START_WORDS = new Set([
  'the', 'a', 'an', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from',
  'and', 'or', 'but', 'so', 'yet', 'nor',
  'i', 'me', 'you', 'he', 'she', 'it', 'we', 'they',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'that', 'this', 'these', 'those', 'what', 'which', 'who',
])

// Check if breaking after this word index would create an orphan
function wouldCreateOrphan(words, breakIndex) {
  const nextWord = words[breakIndex + 1]?.toLowerCase()
  return nextWord && NO_START_WORDS.has(nextWord)
}

// Break lyrics into poetic lines - every break should feel like a breath
function breakIntoPoetryLines(text, ctx, maxWidth) {
  const manualLines = text.split('\n')
  const result = []

  for (const manualLine of manualLines) {
    if (!manualLine.trim()) {
      result.push('')
      continue
    }

    // If line fits, use it as-is
    if (ctx.measureText(manualLine).width <= maxWidth) {
      result.push(manualLine)
      continue
    }

    const words = manualLine.split(' ')
    const lines = []

    // Strategy: build lines greedily, but never break before orphan-prone words
    let i = 0
    while (i < words.length) {
      let currentLine = words[i]
      let lastGoodBreak = i // Track last position where breaking is acceptable

      i++
      while (i < words.length) {
        const testLine = currentLine + ' ' + words[i]
        const testWidth = ctx.measureText(testLine).width

        if (testWidth > maxWidth) {
          // We've exceeded width - need to break
          break
        }

        currentLine = testLine

        // Only mark this as a good break point if next word isn't orphan-prone
        if (!wouldCreateOrphan(words, i)) {
          lastGoodBreak = i
        }
        i++
      }

      // If we stopped mid-phrase (would create orphan), try to find better break
      if (i < words.length && wouldCreateOrphan(words, i - 1)) {
        // Look back for a better break point
        const wordsInLine = currentLine.split(' ')
        let betterBreak = -1

        for (let j = wordsInLine.length - 1; j >= Math.max(0, wordsInLine.length - 3); j--) {
          const wordAtJ = wordsInLine[j]?.toLowerCase()
          const nextWord = wordsInLine[j + 1]?.toLowerCase()

          // Good break: after punctuation, or before a non-orphan word
          if (/[,;:.!?]$/.test(wordsInLine[j]) || (nextWord && !NO_START_WORDS.has(nextWord))) {
            betterBreak = j
            break
          }
        }

        if (betterBreak >= 0 && betterBreak < wordsInLine.length - 1) {
          // Rewind: take fewer words on this line
          const take = betterBreak + 1
          currentLine = wordsInLine.slice(0, take).join(' ')
          i = i - (wordsInLine.length - take)
        }
      }

      lines.push(currentLine)
    }

    // Post-process: fix any remaining orphans at the end
    if (lines.length >= 2) {
      const lastLine = lines[lines.length - 1]
      const lastWords = lastLine.split(' ')

      // If last line is very short (1-2 words, under 12 chars), rebalance
      if (lastWords.length <= 2 && lastLine.length < 12) {
        const prevLine = lines[lines.length - 2]
        const prevWords = prevLine.split(' ')

        if (prevWords.length >= 2) {
          // Try moving 1-2 words down
          for (let moveCount = 1; moveCount <= Math.min(2, prevWords.length - 2); moveCount++) {
            const wordsToMove = prevWords.slice(-moveCount)
            const newPrev = prevWords.slice(0, -moveCount).join(' ')
            const newLast = wordsToMove.join(' ') + ' ' + lastLine

            if (ctx.measureText(newLast).width <= maxWidth &&
                ctx.measureText(newPrev).width <= maxWidth &&
                newPrev.split(' ').length >= 2) {
              lines[lines.length - 2] = newPrev
              lines[lines.length - 1] = newLast
              break
            }
          }
        }
      }
    }

    // Final pass: if only 2 lines, try to balance them evenly
    if (lines.length === 2) {
      const allWords = lines.join(' ').split(' ')
      const total = allWords.length

      // Try different split points to find most balanced
      let bestSplit = -1
      let bestDiff = Infinity

      for (let split = Math.floor(total / 2) - 1; split <= Math.ceil(total / 2) + 1; split++) {
        if (split < 2 || split >= total - 1) continue

        const line1 = allWords.slice(0, split).join(' ')
        const line2 = allWords.slice(split).join(' ')

        // Skip if would create orphan
        if (NO_START_WORDS.has(allWords[split]?.toLowerCase())) continue

        const w1 = ctx.measureText(line1).width
        const w2 = ctx.measureText(line2).width

        if (w1 <= maxWidth && w2 <= maxWidth) {
          const diff = Math.abs(w1 - w2)
          if (diff < bestDiff) {
            bestDiff = diff
            bestSplit = split
          }
        }
      }

      if (bestSplit > 0) {
        lines[0] = allWords.slice(0, bestSplit).join(' ')
        lines[1] = allWords.slice(bestSplit).join(' ')
      }
    }

    result.push(...lines)
  }

  return result
}

export default function ShareModal({ lyric, note, username, isPublic, onVisibilityChange, onClose }) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [includeNote, setIncludeNote] = useState(true)
  const [selectedFormat, setSelectedFormat] = useState('square')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const canvasRef = useRef(null)

  const hasNote = note?.content?.trim()

  const getFullShareUrl = () => {
    if (!shareUrl) return ''
    if (includeNote && hasNote) {
      return `${shareUrl}?n=1`
    }
    return shareUrl
  }

  const copyLink = async () => {
    const url = getFullShareUrl()
    if (!url) return

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      try {
        const input = document.createElement('input')
        input.value = url
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
    const colors = isDarkMode ? darkVariant : signatureStyle
    const { width, height } = FORMATS[format]

    canvas.width = width
    canvas.height = height

    // Draw rich paper texture
    drawPaperTexture(ctx, width, height, isDarkMode)

    // Scale and positioning
    const scale = format === 'tall' ? 1.2 : 1
    const isTall = format === 'tall'

    // Generous margins - editorial spacing
    const marginX = 120
    const maxWidth = width - (marginX * 2)

    // Reserved space
    const topMargin = 80
    const brandHeight = 100  // Space for brand signature at bottom
    const availableHeight = height - topMargin - brandHeight

    // === DYNAMIC FONT SIZING ===
    // First, measure how many lines we'll have at base size
    const baseLyricFontSize = 64 * scale
    ctx.font = `500 ${baseLyricFontSize}px Caveat, cursive`
    const testLines = breakIntoPoetryLines(lyric.content, ctx, maxWidth)
    const lineCount = testLines.filter(l => l !== '').length

    // Scale font based on content length
    let fontScale = 1.0
    if (lineCount <= 2) {
      fontScale = 1.25  // Short lyrics: bigger, more presence
    } else if (lineCount <= 4) {
      fontScale = 1.1   // Medium-short: slightly bigger
    } else if (lineCount >= 8) {
      fontScale = 0.85  // Long lyrics: smaller to fit
    } else if (lineCount >= 6) {
      fontScale = 0.92  // Medium-long: slightly smaller
    }

    // Additional scaling for square format with note - needs more space
    const hasNoteToShow = includeNote && hasNote
    if (!isTall && hasNoteToShow && lineCount >= 4) {
      fontScale *= 0.85  // Scale down more aggressively
    }

    // Typography settings - editorial scale with dynamic sizing
    let lyricFontSize = baseLyricFontSize * fontScale
    let attributionFontSize = 24 * scale
    let noteFontSize = 32 * scale
    const brandFontSize = 26 * scale

    // Recalculate lines with actual font size
    ctx.font = `500 ${lyricFontSize}px Caveat, cursive`
    let lines = breakIntoPoetryLines(lyric.content, ctx, maxWidth)
    let lineHeight = lyricFontSize * 1.35
    let totalLyricHeight = lines.length * lineHeight

    // Estimate total content height
    const ruleAndAttrHeight = (lyric.song_title || lyric.artist_name) ? 130 : 0
    const noteEstimate = hasNoteToShow ? 120 : 0  // Rough estimate for 2-3 lines of note
    const totalContentHeight = totalLyricHeight + ruleAndAttrHeight + noteEstimate

    // If content won't fit, scale down further
    if (totalContentHeight > availableHeight) {
      const scaleFactor = availableHeight / totalContentHeight * 0.95
      lyricFontSize *= scaleFactor
      attributionFontSize *= scaleFactor
      noteFontSize *= scaleFactor

      // Recalculate with new sizes
      ctx.font = `500 ${lyricFontSize}px Caveat, cursive`
      lines = breakIntoPoetryLines(lyric.content, ctx, maxWidth)
      lineHeight = lyricFontSize * 1.35
      totalLyricHeight = lines.length * lineHeight
    }

    // Calculate content positioning
    let contentStartY
    if (isTall) {
      // Story: center the content vertically with bias toward upper-middle
      const contentHeight = totalLyricHeight + ruleAndAttrHeight + noteEstimate
      contentStartY = Math.max(height * 0.25, (height - contentHeight) / 2 - 50)
    } else {
      // Square: position based on content amount
      // Start higher if we have a note to fit
      const baseStart = hasNoteToShow ? height * 0.15 : height * 0.22
      contentStartY = Math.max(topMargin, baseStart)
    }

    // === DRAW LYRICS ===
    ctx.fillStyle = colors.textColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    let y = contentStartY
    lines.forEach((line) => {
      if (line === '') {
        y += lineHeight * 0.5 // Half-height for empty lines
      } else {
        ctx.fillText(line, marginX, y)
        y += lineHeight
      }
    })

    // Track current Y for flowing layout
    let currentY = y

    // === SIGNATURE ELEMENT: THIN RULE ===
    if (lyric.song_title || lyric.artist_name) {
      const ruleY = currentY + 55  // More breathing room after lyrics
      ctx.strokeStyle = colors.accentColor || colors.secondaryColor
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(marginX, ruleY)
      ctx.lineTo(marginX + 80, ruleY)
      ctx.stroke()
      ctx.globalAlpha = 1.0
      currentY = ruleY
    }

    // === DRAW ATTRIBUTION ===
    if (lyric.song_title || lyric.artist_name) {
      const attrY = currentY + 40  // Clear spacing after rule
      ctx.fillStyle = colors.secondaryColor
      ctx.globalAlpha = isDarkMode ? 0.9 : 1.0  // High contrast on dark mode
      ctx.font = `italic 400 ${attributionFontSize}px "DM Sans", system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      let attributionText = ''
      if (lyric.song_title) attributionText += lyric.song_title
      if (lyric.song_title && lyric.artist_name) attributionText += ' — '
      if (lyric.artist_name) attributionText += lyric.artist_name

      ctx.fillText(attributionText, marginX, attrY)
      ctx.globalAlpha = 1.0
      currentY = attrY + attributionFontSize + 30  // More space before note
    }

    // === DRAW NOTE (marginalia style) ===
    if (hasNoteToShow) {
      // Position note with breathing room after attribution
      const noteY = currentY + 50
      const noteMarginX = marginX + 20

      // Calculate available space for note (leave room for brand signature)
      const brandAreaTop = height - brandHeight
      const availableNoteHeight = Math.max(0, brandAreaTop - noteY - 20)

      ctx.font = `400 ${noteFontSize}px Caveat, cursive`
      ctx.textAlign = 'left'

      // Word wrap note
      const noteWords = note.content.split(' ')
      const noteLines = []
      let noteLine = ''
      const noteMaxWidth = maxWidth - 40
      const noteLineHeight = noteFontSize * 1.5

      // Calculate max lines that fit
      const maxNoteLines = Math.max(1, Math.floor(availableNoteHeight / noteLineHeight))

      for (const word of noteWords) {
        const testLine = noteLine ? `${noteLine} ${word}` : word
        const metrics = ctx.measureText(testLine)

        if (metrics.width > noteMaxWidth && noteLine) {
          noteLines.push(noteLine)
          if (noteLines.length >= maxNoteLines) break
          noteLine = word
        } else {
          noteLine = testLine
        }
      }

      // Add final line if we have room
      if (noteLine && noteLines.length < maxNoteLines) {
        noteLines.push(noteLine)
      }

      // Check if we truncated - add ellipsis to last line
      const fullNoteLines = []
      let tempLine = ''
      for (const word of noteWords) {
        const testLine = tempLine ? `${tempLine} ${word}` : word
        const metrics = ctx.measureText(testLine)
        if (metrics.width > noteMaxWidth && tempLine) {
          fullNoteLines.push(tempLine)
          tempLine = word
        } else {
          tempLine = testLine
        }
      }
      if (tempLine) fullNoteLines.push(tempLine)

      const wasTruncated = fullNoteLines.length > noteLines.length
      if (wasTruncated && noteLines.length > 0) {
        let lastLine = noteLines[noteLines.length - 1]
        const ellipsis = '...'
        while (ctx.measureText(lastLine + ellipsis).width > noteMaxWidth && lastLine.length > 0) {
          lastLine = lastLine.slice(0, -1).trim()
        }
        noteLines[noteLines.length - 1] = lastLine + ellipsis
      }

      // Only draw if we have lines to show
      if (noteLines.length > 0) {
        const totalNoteHeight = noteLines.length * noteLineHeight

        // Left border - the marginalia signature
        ctx.strokeStyle = colors.secondaryColor
        ctx.globalAlpha = 0.25
        ctx.lineWidth = 2

        ctx.beginPath()
        ctx.moveTo(marginX, noteY - 8)
        ctx.lineTo(marginX, noteY + totalNoteHeight)
        ctx.stroke()
        ctx.globalAlpha = 1.0

        // Draw note text
        ctx.fillStyle = colors.secondaryColor
        ctx.globalAlpha = 0.7
        noteLines.forEach((line, i) => {
          ctx.fillText(line, noteMarginX, noteY + i * noteLineHeight)
        })
        ctx.globalAlpha = 1.0
      }
    }

    // === BRAND SIGNATURE (bottom, centered) ===
    // Clean. Minimal. Just the name.
    const brandY = height - 70

    ctx.textAlign = 'center'
    ctx.font = `600 ${brandFontSize}px "DM Sans", system-ui, sans-serif`

    // Brand name only
    ctx.fillStyle = colors.secondaryColor
    ctx.globalAlpha = isDarkMode ? 0.85 : 0.65
    ctx.fillText('earwyrm', width / 2, brandY + 5)

    ctx.globalAlpha = 1.0
    ctx.textAlign = 'left'

    return canvas
  }

  const getShareText = () => {
    return `a lyric that stayed with me\n\n— earwyrm\n${getFullShareUrl()}`
  }

  const share = async () => {
    const canvas = generateImage(selectedFormat)
    if (!canvas) return

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `earwyrm-${selectedFormat}.png`, { type: 'image/png' })

      if (navigator.share) {
        const shareData = {
          files: [file],
          text: getShareText(),
          url: getFullShareUrl(),
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

        const imageOnlyData = { files: [file] }
        if (navigator.canShare?.(imageOnlyData)) {
          try {
            await navigator.share(imageOnlyData)
            setShared(true)
            setTimeout(() => setShared(false), 2000)
            return
          } catch (err) {
            if (err.name === 'AbortError') return
          }
        }
      }

      const link = document.createElement('a')
      link.download = `earwyrm-${selectedFormat}.png`
      link.href = URL.createObjectURL(blob)
      link.click()
      URL.revokeObjectURL(link.href)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }, 'image/png')
  }

  useEffect(() => {
    generateImage(selectedFormat)
  }, [lyric, note, includeNote, selectedFormat, isDarkMode])

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

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '24rem',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          borderRadius: '4px',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '1rem',
              color: 'var(--text-secondary, #6B635A)',
            }}
          >
            Share this moment
          </h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted, #9C948A)', padding: '0.25rem' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
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

          {/* Controls */}
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

          {/* Note toggle */}
          {hasNote ? (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeNote}
                onChange={(e) => setIncludeNote(e.target.checked)}
                style={{ marginTop: '0.125rem', width: '1rem', height: '1rem', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #6B635A)' }}>
                  Include my note
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9C948A)', marginTop: '0.125rem' }}>
                  Your words appear as marginalia
                </p>
              </div>
            </label>
          ) : (
            <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted, #9C948A)', textAlign: 'center' }}>
              <button
                onClick={onClose}
                style={{ color: 'var(--text-secondary, #6B635A)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Add a note
              </button>
              {' '}to include your thoughts
            </p>
          )}

          {/* Actions */}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={share}
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
              {shared ? 'Shared' : 'Share'}
            </button>
          </div>

          <button
            onClick={copyLink}
            disabled={loading || !shareUrl}
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.625rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #6B635A)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: loading || !shareUrl ? 'not-allowed' : 'pointer',
              opacity: loading || !shareUrl ? 0.4 : 1,
            }}
          >
            {loading ? 'Generating link...' : copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
