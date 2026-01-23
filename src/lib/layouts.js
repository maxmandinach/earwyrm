/**
 * Layout System for Earwyrm
 *
 * Layouts control spatial arrangement (positioning, scale, hierarchy)
 * while Themes control visual styling (colors, fonts, textures).
 *
 * Together they enable 12 themes × 4 layouts = 48+ unique combinations.
 */

export const layouts = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Centered and balanced',

    // Canvas rendering config (ShareModal)
    canvas: {
      lyricAlign: 'center',
      lyricVertical: 'center',
      lyricScale: 1.0,
      lyricMaxWidth: 0.85,
      attributionAlign: 'center',
      attributionPosition: 'below',
      attributionScale: 0.5,
      padding: { top: 80, right: 80, bottom: 80, left: 80 },
      lyricAttributionGap: 60,
    },
  },

  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine-style asymmetry',

    canvas: {
      lyricAlign: 'left',
      lyricVertical: 0.65,
      lyricScale: 1.0,
      lyricMaxWidth: 0.60,
      attributionAlign: 'right',
      attributionPosition: 'right-vertical',
      attributionScale: 0.4,
      padding: { top: 80, right: 100, bottom: 120, left: 80 },
      lyricAttributionGap: 0,
    },
  },

  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Maximum impact',

    canvas: {
      lyricAlign: 'center',
      lyricVertical: 'center',
      lyricScale: 1.6,
      lyricMaxWidth: 0.90,
      lyricTransform: 'uppercase',
      attributionAlign: 'center',
      attributionPosition: 'bottom',
      attributionScale: 0.3,
      attributionTransform: 'uppercase',
      padding: { top: 60, right: 60, bottom: 100, left: 60 },
      lyricAttributionGap: 40,
    },
  },

  cinematic: {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Letterbox drama',

    canvas: {
      lyricAlign: 'center',
      lyricVertical: 0.72,
      lyricScale: 0.9,
      lyricMaxWidth: 0.75,
      attributionAlign: 'center',
      attributionPosition: 'below',
      attributionScale: 0.45,
      padding: { top: 80, right: 100, bottom: 100, left: 100 },
      lyricAttributionGap: 50,
      letterbox: true,
      letterboxHeight: 0.12,
    },
  },
}

export const layoutList = Object.values(layouts)
