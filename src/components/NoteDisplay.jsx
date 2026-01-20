// Minimal, subtle note display component - styled like marginalia
export default function NoteDisplay({ content, className = '' }) {
  if (!content) return null

  return (
    <div className={`mt-4 px-4 py-3 text-xs leading-relaxed text-charcoal-light/60 italic border-l-2 border-charcoal/20 bg-charcoal/[0.02] rounded-r-sm ${className}`}
         style={{ fontFamily: 'Georgia, serif' }}>
      <span className="text-charcoal-light/40 not-italic mr-1.5">✍</span>
      {content}
    </div>
  )
}
