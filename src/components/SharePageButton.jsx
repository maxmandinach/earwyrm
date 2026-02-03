import { useState } from 'react'

/**
 * Compact share button for page headers.
 * Uses native share sheet if available, otherwise copies URL.
 */
export default function SharePageButton({ url, title }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const shareUrl = url || window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl, title })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = shareUrl
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

  return (
    <button
      onClick={handleShare}
      className="text-charcoal/25 hover:text-charcoal/50 transition-colors p-1"
      title="Share"
    >
      {copied ? (
        <span className="text-xs text-charcoal/50">copied</span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
    </button>
  )
}
