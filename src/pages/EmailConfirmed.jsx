import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function EmailConfirmed() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)

  // Auto-redirect after countdown
  useEffect(() => {
    if (loading) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate(user ? '/home' : '/login', { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [loading, user, navigate])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <h1
          className="text-3xl mb-4"
          style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-primary, #2C2825)' }}
        >
          You're in!
        </h1>
        <p className="text-sm text-charcoal/50 mb-8">
          Your email has been confirmed. Welcome to earwyrm.
        </p>

        <Link
          to={user ? '/home' : '/login'}
          className="inline-block px-6 py-3 text-sm font-medium text-charcoal
                     border border-charcoal/30 hover:border-charcoal/60 transition-colors lowercase"
        >
          {user ? 'go to your earwyrm' : 'sign in'}
        </Link>

        <p className="mt-4 text-xs text-charcoal/25">
          Redirecting in {countdown}s...
        </p>
      </div>
    </div>
  )
}
