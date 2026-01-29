/**
 * Earwyrm Paper Texture System
 *
 * Simplified approach: CSS-based colors that support light/dark modes
 * without complex procedural textures that cause tiling artifacts.
 */

/**
 * Apply CSS custom properties for the color scheme
 * Called on app init and when theme changes
 */
export function applyColorScheme(mode = 'light') {
  const root = document.documentElement

  if (mode === 'dark') {
    root.classList.add('dark')
    // Dark mode - warm dark tones
    root.style.setProperty('--surface-bg', '#1A1816')
    root.style.setProperty('--surface-card', '#252220')
    root.style.setProperty('--surface-elevated', '#2D2A27')
    root.style.setProperty('--text-primary', '#F7F3EC')
    root.style.setProperty('--text-secondary', '#E8E0D6')
    root.style.setProperty('--text-muted', '#C8BEB4')
    root.style.setProperty('--border-subtle', 'rgba(255,255,255,0.08)')
    root.style.setProperty('--border-medium', 'rgba(255,255,255,0.12)')
    root.style.setProperty('--shadow-card', '0 2px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)')
    root.style.setProperty('--vignette-color', 'rgba(0,0,0,0.4)')
  } else {
    root.classList.remove('dark')
    // Light mode - warm cream tones
    root.style.setProperty('--surface-bg', '#E8E2D9')
    root.style.setProperty('--surface-card', '#F5F2ED')
    root.style.setProperty('--surface-elevated', '#FAF8F5')
    root.style.setProperty('--text-primary', '#1A1714')
    root.style.setProperty('--text-secondary', '#4A433B')
    root.style.setProperty('--text-muted', '#7A7268')
    root.style.setProperty('--border-subtle', 'rgba(0,0,0,0.06)')
    root.style.setProperty('--border-medium', 'rgba(0,0,0,0.1)')
    root.style.setProperty('--shadow-card', '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08)')
    root.style.setProperty('--vignette-color', 'rgba(60,50,40,0.08)')
  }

  // Apply background to body
  document.body.style.backgroundColor = getComputedStyle(root).getPropertyValue('--surface-bg')
}

/**
 * Get user's preferred color scheme
 */
export function getPreferredColorScheme() {
  // Check localStorage first
  const stored = localStorage.getItem('earwyrm-theme')
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  // If 'auto' or not set, use system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

/**
 * Set color scheme preference
 */
export function setColorSchemePreference(preference) {
  // preference can be 'light', 'dark', or 'auto'
  localStorage.setItem('earwyrm-theme', preference)

  const effectiveMode = preference === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference

  applyColorScheme(effectiveMode)
  return effectiveMode
}

/**
 * Initialize the color scheme on page load
 */
export function initializePageTexture() {
  if (typeof window === 'undefined') return

  const mode = getPreferredColorScheme()
  applyColorScheme(mode)

  // Listen for system preference changes (only matters if set to 'auto')
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const stored = localStorage.getItem('earwyrm-theme')
      if (!stored || stored === 'auto') {
        applyColorScheme(e.matches ? 'dark' : 'light')
      }
    })
  }

  return mode
}

/**
 * For share card canvas - apply background
 * Matches signatureStyle.backgroundColor in themes.js
 */
export function applyPaperTextureToCanvas(ctx, width, height, options = {}) {
  ctx.fillStyle = '#F5F2ED'  // warm cream
  ctx.fillRect(0, 0, width, height)
}

/**
 * For dark share cards
 * Matches darkVariant.backgroundColor in themes.js
 */
export function applyDarkPaperTexture(ctx, width, height, options = {}) {
  ctx.fillStyle = '#252220'  // warm dark
  ctx.fillRect(0, 0, width, height)
}

// Legacy exports for compatibility
export function getBackgroundTexture() {
  return null // No longer using data URLs
}

export function getCardTexture() {
  return null // No longer using data URLs
}
