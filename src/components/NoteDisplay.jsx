// Minimal, subtle note display component
export default function NoteDisplay({ content, className = '' }) {
  if (!content) return null

  return (
    <div className={`mt-3 px-3 py-2 text-xs text-charcoal-light/70 italic border-l-2 border-charcoal/10 ${className}`}>
      {content}
    </div>
  )
}
