// Quiet, journal-like note display
export default function NoteDisplay({ content, className = '' }) {
  if (!content) return null

  return (
    <div className={`px-4 py-3 text-xs leading-loose text-charcoal/40 italic border-l border-charcoal/10 ${className}`}
         style={{ fontFamily: 'Georgia, serif' }}>
      {content}
    </div>
  )
}
