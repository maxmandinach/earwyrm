// Earwyrm signature style - warm, personal, handwritten
export const signatureStyle = {
  id: 'signature',
  name: 'Earwyrm',
  description: 'Warm and personal',
  fontFamily: "'Caveat', cursive",
  fontSize: '1.875rem',
  fontWeight: '500',
  lineHeight: '1.5',
  fontStyle: 'normal',
  letterSpacing: '0.01em',
  textAlign: 'left',
  backgroundColor: '#FBF8F3',
  textColor: '#3D3226',
  secondaryColor: '#8B7355',
}

// Legacy support - all theme lookups return signature style
export const themes = {
  default: signatureStyle,
  handwritten: signatureStyle,
  // Map any old theme to signature style
}

// Proxy to return signature style for any theme lookup
export const getTheme = (themeId) => signatureStyle

export const themeList = [signatureStyle]
