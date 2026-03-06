export default function PlusBadge({ size = 14 }) {
  return (
    <span className="plus-badge" style={{
      fontFamily: "'Caveat', cursive",
      fontSize: size,
      fontWeight: 600,
      marginLeft: 3,
      padding: `${size * 0.15}px ${size * 0.5}px`,
      borderRadius: size * 0.35,
      display: 'inline-block',
      lineHeight: 1.2,
    }}>e+</span>
  )
}
