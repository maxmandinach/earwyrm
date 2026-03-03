export default function PlusBadge({ size = 14 }) {
  const padding = `${size * 0.1}px ${size * 0.3}px`
  return (
    <span className="plus-badge" style={{
      fontFamily: "'Caveat', cursive",
      fontSize: size,
      fontWeight: 600,
      marginLeft: 3,
      padding,
      borderRadius: '999px',
      display: 'inline-block',
      lineHeight: 1.2,
    }}>e</span>
  )
}
