/**
 * Format a timestamp into a relative, human-readable string
 */
export function formatRelativeTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now - date
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return 'just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays === 1) return 'yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 14) return 'last week'
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 60) return 'last month'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Rotate through prompts
 */
export const prompts = [
  "What lyric has been looping in your head?",
  "What lyric won't leave you alone?",
  "What lyric are you carrying right now?",
  "What lyric keeps coming back?",
  "What lyric feels true today?",
]

export function getRandomPrompt() {
  return prompts[Math.floor(Math.random() * prompts.length)]
}

/**
 * Validate username format
 */
export function isValidUsername(username) {
  // 3-20 characters, alphanumeric and underscores only
  const regex = /^[a-zA-Z0-9_]{3,20}$/
  return regex.test(username)
}

/**
 * Generate a public profile URL
 */
export function getPublicProfileUrl(username) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/@${username}`
}

/**
 * Generate a random share token
 */
export function generateShareToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Generate a shareable URL for a lyric
 */
export function getShareableUrl(token) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/s/${token}`
}
