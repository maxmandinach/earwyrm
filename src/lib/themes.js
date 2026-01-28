// Earwyrm signature style - warm, personal, handwritten
// "Earwyrm is a journal, not a player"
// NOTE: For share card canvas rendering, use hardcoded hex values
// (Canvas context cannot resolve CSS variables)

export const signatureStyle = {
  id: 'signature',
  name: 'Earwyrm',
  description: 'Warm and personal',

  // Typography
  fontFamily: "'Caveat', cursive",
  fontSize: '1.875rem',
  fontWeight: '500',
  lineHeight: '1.5',
  fontStyle: 'normal',
  letterSpacing: '0.01em',
  textAlign: 'left',

  // Colors - hardcoded for canvas rendering (light mode share cards)
  backgroundColor: '#F5F2ED',      // warm cream
  cardBackground: '#FAF8F5',       // slightly lighter
  textColor: '#2C2825',            // warm charcoal
  secondaryColor: '#6B635A',       // muted brown
  mutedColor: '#9C948A',           // light gray
  accentColor: '#B8A99A',          // taupe accent
  dividerColor: '#EBE4D8',         // subtle cream
}

// Dark variant for share cards - high contrast for legibility
export const darkVariant = {
  backgroundColor: '#252220',      // warm dark (matches applyDarkPaperTexture)
  textColor: '#FAF8F5',            // bright warm white - high contrast
  secondaryColor: '#C8C0B5',       // lighter gray - readable
  mutedColor: '#9C948A',           // muted for subtle elements
  accentColor: '#C8B8A8',          // brighter taupe for visibility
  dividerColor: '#4A4540',         // visible divider
}

// Legacy support - all theme lookups return signature style
export const themes = {
  default: signatureStyle,
  handwritten: signatureStyle,
  signature: signatureStyle,
}

// Proxy to return signature style for any theme lookup
export const getTheme = (themeId) => signatureStyle

export const themeList = [signatureStyle]
