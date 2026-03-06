import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import { signatureStyle, darkVariant } from '../lib/themes'
import { generateShareToken, getShareableUrl, getPublicProfileUrl } from '../lib/utils'
import { supabase } from '../lib/supabase-wrapper'
import { applyPaperTextureToCanvas, applyDarkPaperTexture } from '../lib/paperTexture'
import { generateCardArt } from '../lib/card-art'
import PlusPaywall from './PlusPaywall'

const FORMATS = {
  square: { width: 1080, height: 1080, label: 'Square', hint: '1:1' },
  tall: { width: 1080, height: 1920, label: 'Tall', hint: '9:16' },
}

// Draw paper texture with optional border
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

// Words that should never start a line (they belong with the previous word)
const NO_START_WORDS = new Set([
  'the', 'a', 'an', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from',
  'and', 'or', 'but', 'so', 'yet', 'nor',
  'i', 'me', 'you', 'he', 'she', 'it', 'we', 'they',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'that', 'this', 'these', 'those', 'what', 'which', 'who',
])

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

    if (ctx.measureText(manualLine).width <= maxWidth) {
      result.push(manualLine)
      continue
    }

    const words = manualLine.split(' ')
    const lines = []

    let i = 0
    while (i < words.length) {
      let currentLine = words[i]
      i++
      while (i < words.length) {
        const testLine = currentLine + ' ' + words[i]
        const testWidth = ctx.measureText(testLine).width

        if (testWidth > maxWidth) break

        currentLine = testLine

        if (!wouldCreateOrphan(words, i)) {
          // good break point
        }
        i++
      }

      if (i < words.length && wouldCreateOrphan(words, i - 1)) {
        const wordsInLine = currentLine.split(' ')

        for (let j = wordsInLine.length - 1; j >= Math.max(0, wordsInLine.length - 3); j--) {
          const nextWord = wordsInLine[j + 1]?.toLowerCase()

          if (/[,;:.!?]$/.test(wordsInLine[j]) || (nextWord && !NO_START_WORDS.has(nextWord))) {
            const take = j + 1
            currentLine = wordsInLine.slice(0, take).join(' ')
            i = i - (wordsInLine.length - take)
            break
          }
        }
      }

      lines.push(currentLine)
    }

    // Fix remaining orphans at the end
    if (lines.length >= 2) {
      const lastLine = lines[lines.length - 1]
      const lastWords = lastLine.split(' ')

      if (lastWords.length <= 2 && lastLine.length < 12) {
        const prevLine = lines[lines.length - 2]
        const prevWords = prevLine.split(' ')

        if (prevWords.length >= 2) {
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

    // Balance 2-line splits
    if (lines.length === 2) {
      const allWords = lines.join(' ').split(' ')
      const total = allWords.length

      let bestSplit = -1
      let bestDiff = Infinity

      for (let split = Math.floor(total / 2) - 1; split <= Math.ceil(total / 2) + 1; split++) {
        if (split < 2 || split >= total - 1) continue

        const line1 = allWords.slice(0, split).join(' ')
        const line2 = allWords.slice(split).join(' ')

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

function getInitialDarkMode() {
  const stored = localStorage.getItem('earwyrm-theme')
  if (stored === 'dark') return true
  if (stored === 'light') return false
  // auto: follow system
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export default function ShareModal({ lyric, note: noteProp, onClose, onNoteCreated }) {
  const { user, profile: authProfile } = useAuth()
  const { saveNote } = useLyric()
  const isOwn = user?.id === lyric.user_id
  const [tab, setTab] = useState('lyric') // 'lyric' | 'page'
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedFormat, setSelectedFormat] = useState('square')
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode)
  const [visible, setVisible] = useState(false)
  const [username, setUsername] = useState(lyric.profiles?.username || null)
  const [shareStyle, setShareStyle] = useState('minimal') // 'minimal' | 'coverArt' | 'aiArt'
  const [coverArtImg, setCoverArtImg] = useState(null)
  const [aiArtImg, setAiArtImg] = useState(null)
  const [aiArtLoading, setAiArtLoading] = useState(false)
  const [aiArtError, setAiArtError] = useState('')
  const [artRemaining, setArtRemaining] = useState(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showFreeGenConfirm, setShowFreeGenConfirm] = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [inlineNote, setInlineNote] = useState('')
  const [savedNoteContent, setSavedNoteContent] = useState(null)
  const canvasRef = useRef(null)

  const isPlus = authProfile?.subscription_tier === 'plus'

  // Effective note content — saved inline note takes priority, then prop
  const noteContent = savedNoteContent || noteProp?.content || null

  const profileUrl = authProfile?.username ? getPublicProfileUrl(authProfile.username) : ''

  // Fetch username if not available from joined data
  useEffect(() => {
    if (username) return
    async function fetchUsername() {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', lyric.user_id)
        .single()
      if (data?.username) setUsername(data.username)
    }
    fetchUsername()
  }, [lyric.user_id, username])

  // Load cover art image for canvas rendering
  useEffect(() => {
    if (!lyric.cover_art_url) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setCoverArtImg(img)
    img.onerror = () => setCoverArtImg(null)
    img.src = lyric.cover_art_url
  }, [lyric.cover_art_url])

  // Pre-load existing card art if available
  useEffect(() => {
    if (!lyric.card_art_url) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setAiArtImg(img)
      setShareStyle('aiArt')
    }
    img.onerror = () => {} // silently fail
    img.src = lyric.card_art_url
  }, [lyric.card_art_url])

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const [wasFreeTierGen, setWasFreeTierGen] = useState(false)
  const [freeGenExhausted, setFreeGenExhausted] = useState(false)
  const [paywallContext, setPaywallContext] = useState(null)

  const aiArtLocked = !isPlus && !aiArtImg && freeGenExhausted

  const handleGenerateArt = async () => {
    setAiArtLoading(true)
    setAiArtError('')
    setWasFreeTierGen(false)

    try {
      // Save inline note to DB if provided and no existing note
      let effectiveNote = noteContent
      if (!noteContent && inlineNote.trim()) {
        try {
          const saved = await saveNote(lyric.id, inlineNote.trim(), false)
          setSavedNoteContent(inlineNote.trim())
          effectiveNote = inlineNote.trim()
          if (onNoteCreated && saved) onNoteCreated(saved)
        } catch (err) {
          console.error('Error saving inline note:', err)
        }
      }

      const session = await supabase.auth.getSession()
      const accessToken = session?.data?.session?.access_token
      if (!accessToken) throw new Error('Not signed in')

      const result = await generateCardArt({
        lyricContent: lyric.content,
        noteContent: effectiveNote || null,
        songTitle: lyric.song_title,
        artistName: lyric.artist_name,
        tags: lyric.tags,
        lyricId: lyric.id,
      }, accessToken)

      setArtRemaining(result.remaining)
      if (result.is_free_gen) setWasFreeTierGen(true)

      // Load the image
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = result.image_url
      })

      setAiArtImg(img)
      setShareStyle('aiArt')
    } catch (err) {
      if (err.upgrade) {
        setFreeGenExhausted(true)
        setPaywallContext('ai_art')
        setShowPaywall(true)
      } else {
        console.error('AI art generation failed:', err)
        setAiArtError(err.message || 'Generation failed')
      }
    } finally {
      setAiArtLoading(false)
    }
  }

  const handleArtAction = () => {
    // Free user who already used their gen → paywall immediately
    if (!isPlus && (freeGenExhausted || wasFreeTierGen)) {
      setPaywallContext('ai_art')
      setShowPaywall(true)
      return
    }
    if (aiArtImg) {
      setShowRegenConfirm(true)
    } else if (!isPlus) {
      setShowFreeGenConfirm(true)
    } else {
      handleGenerateArt()
    }
  }

  const copyLink = async (url) => {
    const linkToCopy = url || (tab === 'page' ? profileUrl : shareUrl)
    if (!linkToCopy) return

    try {
      await navigator.clipboard.writeText(linkToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      try {
        const input = document.createElement('input')
        input.value = linkToCopy
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

    drawPaperTexture(ctx, width, height, isDarkMode)

    // Draw cover art background at low opacity
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

    // Draw AI art background at high opacity with gradient overlay
    if (shareStyle === 'aiArt' && aiArtImg) {
      ctx.save()
      ctx.globalAlpha = 0.8
      const imgAspect = aiArtImg.width / aiArtImg.height
      const canvasAspect = width / height
      let sx = 0, sy = 0, sw = aiArtImg.width, sh = aiArtImg.height
      if (imgAspect > canvasAspect) {
        sw = aiArtImg.height * canvasAspect
        sx = (aiArtImg.width - sw) / 2
      } else {
        sh = aiArtImg.width / canvasAspect
        sy = (aiArtImg.height - sh) / 2
      }
      ctx.drawImage(aiArtImg, sx, sy, sw, sh, 0, 0, width, height)
      ctx.globalAlpha = 1.0

      // Gradient overlay for text legibility
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      const bgColor = isDarkMode ? '37, 34, 32' : '245, 242, 237'
      gradient.addColorStop(0, `rgba(${bgColor}, 0.3)`)
      gradient.addColorStop(0.5, `rgba(${bgColor}, 0.6)`)
      gradient.addColorStop(1, `rgba(${bgColor}, 0.85)`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }

    const scale = format === 'tall' ? 1.2 : 1
    const isTall = format === 'tall'

    const marginX = 120
    const maxWidth = width - (marginX * 2)

    const topMargin = 80
    const brandHeight = 100
    const availableHeight = height - topMargin - brandHeight

    // Dynamic font sizing
    const baseLyricFontSize = 64 * scale
    ctx.font = `500 ${baseLyricFontSize}px Caveat, cursive`
    const testLines = breakIntoPoetryLines(lyric.content, ctx, maxWidth)
    const lineCount = testLines.filter(l => l !== '').length

    let fontScale = 1.0
    if (lineCount <= 2) {
      fontScale = 1.25
    } else if (lineCount <= 4) {
      fontScale = 1.1
    } else if (lineCount >= 8) {
      fontScale = 0.85
    } else if (lineCount >= 6) {
      fontScale = 0.92
    }

    let lyricFontSize = baseLyricFontSize * fontScale
    let attributionFontSize = 24 * scale
    const brandFontSize = 26 * scale

    ctx.font = `500 ${lyricFontSize}px Caveat, cursive`
    let lines = breakIntoPoetryLines(lyric.content, ctx, maxWidth)
    let lineHeight = lyricFontSize * 1.35
    let totalLyricHeight = lines.length * lineHeight

    const ruleAndAttrHeight = (lyric.song_title || lyric.artist_name) ? 130 : 0
    const totalContentHeight = totalLyricHeight + ruleAndAttrHeight

    if (totalContentHeight > availableHeight) {
      const scaleFactor = availableHeight / totalContentHeight * 0.95
      lyricFontSize *= scaleFactor
      attributionFontSize *= scaleFactor

      ctx.font = `500 ${lyricFontSize}px Caveat, cursive`
      lines = breakIntoPoetryLines(lyric.content, ctx, maxWidth)
      lineHeight = lyricFontSize * 1.35
      totalLyricHeight = lines.length * lineHeight
    }

    // Position content
    let contentStartY
    if (isTall) {
      const contentHeight = totalLyricHeight + ruleAndAttrHeight
      contentStartY = Math.max(height * 0.25, (height - contentHeight) / 2 - 50)
    } else {
      contentStartY = Math.max(topMargin, height * 0.22)
    }

    // Draw lyrics
    ctx.fillStyle = colors.textColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    let y = contentStartY
    lines.forEach((line) => {
      if (line === '') {
        y += lineHeight * 0.5
      } else {
        ctx.fillText(line, marginX, y)
        y += lineHeight
      }
    })

    let currentY = y

    // Thin rule
    if (lyric.song_title || lyric.artist_name) {
      const ruleY = currentY + 55
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

    // Attribution
    if (lyric.song_title || lyric.artist_name) {
      const attrY = currentY + 40
      ctx.fillStyle = colors.secondaryColor
      ctx.globalAlpha = isDarkMode ? 0.9 : 1.0
      ctx.font = `italic 400 ${attributionFontSize}px "DM Sans", system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      let attributionText = ''
      if (lyric.song_title) attributionText += lyric.song_title
      if (lyric.song_title && lyric.artist_name) attributionText += ' — '
      if (lyric.artist_name) attributionText += lyric.artist_name

      // Draw cover art thumbnail next to attribution
      let textOffsetX = marginX
      if (shareStyle === 'coverArt' && coverArtImg) {
        const thumbSize = Math.round(attributionFontSize * 1.8)
        const thumbRadius = 4
        ctx.save()
        ctx.globalAlpha = 1.0
        ctx.beginPath()
        const tx = marginX, ty = attrY - 4
        ctx.moveTo(tx + thumbRadius, ty)
        ctx.arcTo(tx + thumbSize, ty, tx + thumbSize, ty + thumbSize, thumbRadius)
        ctx.arcTo(tx + thumbSize, ty + thumbSize, tx, ty + thumbSize, thumbRadius)
        ctx.arcTo(tx, ty + thumbSize, tx, ty, thumbRadius)
        ctx.arcTo(tx, ty, tx + thumbSize, ty, thumbRadius)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(coverArtImg, tx, ty, thumbSize, thumbSize)
        ctx.restore()
        textOffsetX = marginX + thumbSize + 12
      }

      ctx.fillText(attributionText, textOffsetX, attrY)
      ctx.globalAlpha = 1.0
    }

    // Brand signature + username
    const brandY = height - 70

    ctx.textAlign = 'center'

    // Username attribution
    if (username) {
      ctx.font = `400 ${brandFontSize * 0.8}px "DM Sans", system-ui, sans-serif`
      ctx.fillStyle = colors.secondaryColor
      ctx.globalAlpha = isDarkMode ? 0.6 : 0.4
      ctx.fillText(`@${username}`, width / 2, brandY - 22)
    }

    ctx.font = `600 ${brandFontSize}px "DM Sans", system-ui, sans-serif`
    ctx.fillStyle = colors.secondaryColor
    ctx.globalAlpha = isDarkMode ? 0.85 : 0.65
    ctx.fillText('earwyrm', width / 2, brandY + 5)

    ctx.globalAlpha = 1.0
    ctx.textAlign = 'left'

    return canvas
  }

  const getShareText = () => {
    return `a lyric that stayed with me\n\n— earwyrm\n${shareUrl}`
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
  }, [lyric, selectedFormat, isDarkMode, username, shareStyle, coverArtImg, aiArtImg])

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
          lyric.share_token = token
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
        {/* Drag handle - mobile only */}
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

        {/* Tab toggle — only show if this is the user's own lyric */}
        {isOwn && (
          <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', border: '1px solid var(--border-medium, rgba(0,0,0,0.1))', borderRadius: '4px', overflow: 'hidden' }}>
              <button
                onClick={() => { setTab('lyric'); setCopied(false) }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  backgroundColor: tab === 'lyric' ? 'var(--text-primary, #2C2825)' : 'transparent',
                  color: tab === 'lyric' ? 'var(--surface-bg, #F5F2ED)' : 'var(--text-secondary, #6B635A)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                This lyric
              </button>
              <button
                onClick={() => { setTab('page'); setCopied(false) }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  backgroundColor: tab === 'page' ? 'var(--text-primary, #2C2825)' : 'transparent',
                  color: tab === 'page' ? 'var(--surface-bg, #F5F2ED)' : 'var(--text-secondary, #6B635A)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Your page
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: '0 1.5rem 1.5rem' }}>
          {tab === 'page' ? (
            /* ---- YOUR PAGE tab ---- */
            <div>
              <p className="text-xs text-charcoal/40 text-center mb-4 leading-relaxed">
                Share your page — visitors will always see<br />whatever lyric is on your mind right now
              </p>

              {/* Profile URL display */}
              <div
                className="flex items-center justify-between gap-2 p-3 mb-4"
                style={{
                  backgroundColor: 'var(--surface-bg, #FAF8F5)',
                  border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
                }}
              >
                <span className="text-sm text-charcoal/60 truncate">
                  {profileUrl.replace(/^https?:\/\//, '')}
                </span>
              </div>

              {/* Share page (native share sheet) */}
              {navigator.share && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: 'my earwyrm',
                        text: 'see what lyric is on my mind',
                        url: profileUrl,
                      })
                      setShared(true)
                      setTimeout(() => setShared(false), 2000)
                    } catch (err) {
                      if (err.name !== 'AbortError') console.error('Share failed:', err)
                    }
                  }}
                  disabled={!profileUrl}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    backgroundColor: 'var(--text-primary, #2C2825)',
                    color: 'var(--surface-bg, #F5F2ED)',
                    border: 'none',
                    cursor: profileUrl ? 'pointer' : 'not-allowed',
                    opacity: profileUrl ? 1 : 0.4,
                  }}
                >
                  {shared ? 'Shared' : 'Share'}
                </button>
              )}

              {/* Copy page link */}
              <button
                onClick={() => copyLink(profileUrl)}
                disabled={!profileUrl}
                style={{
                  width: '100%',
                  marginTop: navigator.share ? '0.5rem' : 0,
                  padding: navigator.share ? '0.625rem' : '0.875rem',
                  fontSize: '0.875rem',
                  fontWeight: navigator.share ? 400 : 500,
                  backgroundColor: navigator.share ? 'transparent' : 'var(--text-primary, #2C2825)',
                  color: navigator.share ? 'var(--text-secondary, #6B635A)' : 'var(--surface-bg, #F5F2ED)',
                  border: 'none',
                  cursor: profileUrl ? 'pointer' : 'not-allowed',
                  opacity: profileUrl ? 1 : 0.4,
                }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          ) : (
            /* ---- THIS LYRIC tab ---- */
            <>
              <p className="text-xs text-charcoal/40 text-center mb-3">
                A permanent link to this specific lyric
              </p>

              {/* Preview */}
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    height: selectedFormat === 'tall' ? '20rem' : '14rem',
                    aspectRatio: selectedFormat === 'tall' ? '9/16' : '1/1',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    transition: 'all 0.3s ease-out',
                    opacity: aiArtLoading ? 0.4 : 1,
                  }}
                />
                {aiArtLoading && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      border: '2px solid var(--border-medium, rgba(0,0,0,0.1))',
                      borderTopColor: 'var(--accent, #B8A99A)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}
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

              {/* Style toggle — always show AI Art, with inline generate/regen button */}
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
                  {lyric.cover_art_url && coverArtImg && (
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
                  )}
                  <button
                    onClick={() => {
                      if (aiArtLocked) {
                        setPaywallContext('ai_art')
                        setShowPaywall(true)
                        return
                      }
                      setShareStyle('aiArt')
                    }}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      fontSize: '0.8rem',
                      backgroundColor: shareStyle === 'aiArt' ? 'var(--text-primary, #2C2825)' : 'transparent',
                      color: shareStyle === 'aiArt' ? 'var(--surface-bg, #F5F2ED)' : 'var(--text-secondary, #6B635A)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem' }}>{aiArtLocked ? '🔒' : '✦'}</span>
                    <span>AI Art</span>
                  </button>
                  {/* Inline generate/regenerate icon */}
                  {shareStyle === 'aiArt' && !aiArtLoading && (
                    <button
                      onClick={() => {
                        if (!isPlus && freeGenExhausted) {
                          setPaywallContext('ai_art')
                          setShowPaywall(true)
                        } else {
                          handleArtAction()
                        }
                      }}
                      style={{
                        padding: '0.5rem 0.625rem',
                        fontSize: '0.8rem',
                        color: 'var(--accent, #B8A99A)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderLeft: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={aiArtImg ? 'Regenerate artwork' : 'Generate artwork'}
                    >
                      {aiArtImg ? '↻' : '✦'}
                    </button>
                  )}
                </div>
              </div>

              {/* AI Art loading/error indicators */}
              {shareStyle === 'aiArt' && aiArtLoading && (
                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0',
                  }}>
                    <span style={{
                      fontSize: '0.8rem',
                      color: 'var(--accent, #B8A99A)',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}>
                      ✦ generating unique artwork...
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      color: 'var(--text-muted, #9E9589)',
                    }}>
                      this takes about 10 seconds
                    </span>
                    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
                  </div>
                </div>
              )}
              {aiArtError && (
                <p style={{ fontSize: '0.7rem', color: '#c44', marginTop: '0.25rem', textAlign: 'center' }}>{aiArtError}</p>
              )}

              {/* Actions */}
              <div style={{ marginTop: '1rem' }}>
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
                  {shared ? 'Shared' : 'Share image'}
                </button>
              </div>

              <button
                onClick={() => copyLink(shareUrl)}
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
                {loading ? 'Generating link...' : copied ? 'Copied' : 'Copy lyric link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {createPortal(modalContent, document.body)}
      {showPaywall && <PlusPaywall context={paywallContext} onClose={() => { setShowPaywall(false); setPaywallContext(null) }} />}
      {showFreeGenConfirm && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowFreeGenConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface-card, #F5F2ED)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '20rem',
              width: '90%',
              textAlign: 'center',
            }}
          >
            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary, #2C2825)', marginBottom: '0.5rem' }}>
              Create Your Artwork
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6B635A)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              This is your one free generation — make it count.
            </p>
            {!noteContent ? (
              <div style={{ marginBottom: '0.75rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary, #2C2825)', display: 'block', marginBottom: '0.2rem' }}>
                  add a personal note
                </label>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted, #9E9589)', marginBottom: '0.375rem' }}>
                  saves to your share card · private by default · shapes your artwork
                </p>
                <textarea
                  value={inlineNote}
                  onChange={e => setInlineNote(e.target.value)}
                  placeholder="what does this lyric mean to you?"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    fontFamily: "'Caveat', cursive",
                    color: 'var(--text-secondary, #6B635A)',
                    backgroundColor: 'var(--surface-bg, #FAF8F5)',
                    border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
                    borderRadius: '6px',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent, #B8A99A)' }}>✓</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6B635A)' }}>Your note will shape the artwork</span>
              </div>
            )}
            <button
              onClick={() => { setShowFreeGenConfirm(false); handleGenerateArt() }}
              style={{
                width: '100%', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 500,
                backgroundColor: 'var(--text-primary, #2C2825)', color: 'var(--surface-bg, #F5F2ED)',
                border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              }}
            >
              <span style={{ fontSize: '0.75rem' }}>✦</span>
              <span>Generate</span>
            </button>
            <button
              onClick={() => { setShowFreeGenConfirm(false); setPaywallContext('ai_art'); setShowPaywall(true) }}
              style={{
                width: '100%', padding: '0.5rem', fontSize: '0.8rem',
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--accent, #B8A99A)',
              }}
            >
              Want more? Try earwyrm+
            </button>
          </div>
        </div>,
        document.body
      )}
      {showRegenConfirm && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowRegenConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface-card, #F5F2ED)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '20rem',
              width: '90%',
              textAlign: 'center',
            }}
          >
            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary, #2C2825)', marginBottom: '0.5rem' }}>
              Generate new artwork?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6B635A)', marginBottom: '1rem', lineHeight: 1.4 }}>
              This will replace your current art.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowRegenConfirm(false)}
                style={{
                  flex: 1, padding: '0.625rem', fontSize: '0.85rem',
                  backgroundColor: 'transparent', border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
                  borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary, #6B635A)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowRegenConfirm(false); handleGenerateArt() }}
                style={{
                  flex: 1, padding: '0.625rem', fontSize: '0.85rem', fontWeight: 500,
                  backgroundColor: 'var(--text-primary, #2C2825)', color: 'var(--surface-bg, #F5F2ED)',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                }}
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
