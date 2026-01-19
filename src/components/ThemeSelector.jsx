import { useState } from 'react'
import { themes, themeList } from '../lib/themes'

function ThemePreview({ theme, lyricContent, isSelected, onClick }) {
  const previewStyle = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: '0.75rem',
    fontWeight: theme.fontWeight,
    lineHeight: theme.lineHeight,
    fontStyle: theme.fontStyle,
    letterSpacing: theme.letterSpacing,
    textAlign: theme.textAlign,
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 text-left transition-all ${
        isSelected
          ? 'ring-2 ring-charcoal ring-offset-2 ring-offset-cream'
          : 'hover:ring-1 hover:ring-charcoal/30'
      }`}
      style={previewStyle}
    >
      <p className="line-clamp-2 mb-2">
        {lyricContent || 'Your lyric here...'}
      </p>
      <p className="text-xs mt-2 opacity-60">{theme.name}</p>
    </button>
  )
}

export default function ThemeSelector({ currentTheme, lyricContent, onSelect, onClose }) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme)

  const handleDone = () => {
    if (selectedTheme !== currentTheme) {
      onSelect(selectedTheme)
    }
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/20">
      <div className="bg-cream w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-charcoal/10">
          <h2 className="text-lg font-medium text-charcoal">Change style</h2>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {themeList.map((theme) => (
              <ThemePreview
                key={theme.id}
                theme={theme}
                lyricContent={lyricContent}
                isSelected={selectedTheme === theme.id}
                onClick={() => setSelectedTheme(theme.id)}
              />
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-charcoal/10 flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-sm text-charcoal-light hover:text-charcoal
                       border border-charcoal/20 hover:border-charcoal/40
                       transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="px-6 py-2 text-sm font-medium text-cream bg-charcoal
                       hover:bg-charcoal/80 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
