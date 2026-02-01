import { useRef, useState, useEffect } from 'react'

/**
 * Triggers a one-time reveal when an element enters the viewport.
 * Returns a ref to attach and a boolean `revealed`.
 * Once revealed, stays revealed — no re-animating on scroll back.
 */
export default function useRevealOnScroll(options = {}) {
  const { threshold = 0.15, rootMargin = '0px 0px -40px 0px' } = options
  const ref = useRef(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, revealed }
}
