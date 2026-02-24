import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'

export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState(null)

  // Exchange PKCE code for session (Supabase v2 email confirmations)
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        setError(true)
      })
    }
  }, [searchParams])

  useEffect(() => {
    // Listen for password recovery specifically — redirect to settings
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/settings', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  useEffect(() => {
    if (loading) return

    if (user) {
      // Check if this was a signup confirmation
      const hash = window.location.hash
      if (hash.includes('type=signup') || searchParams.get('type') === 'signup') {
        navigate('/confirmed', { replace: true })
      } else {
        navigate('/home', { replace: true })
      }
      return
    }

    // If not loading and no user after a delay, something went wrong
    const timeout = setTimeout(() => {
      setError(true)
    }, 8000)

    return () => clearTimeout(timeout)
  }, [user, loading, navigate, searchParams])

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <h1
            className="text-3xl mb-4"
            style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-primary, #2C2825)' }}
          >
            something went wrong
          </h1>
          <p className="text-sm text-charcoal/50 mb-4">
            We couldn't verify your link. It may have expired.
          </p>
          <p className="text-xs text-charcoal/30 mb-8 break-all">
            Debug: {window.location.href}
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-3 text-sm font-medium text-charcoal
                       border border-charcoal/30 hover:border-charcoal/60 transition-colors lowercase"
          >
            back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <h1
          className="text-3xl mb-4"
          style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-primary, #2C2825)' }}
        >
          confirming...
        </h1>
        <p className="text-sm text-charcoal/50">
          Hang tight, we're verifying your link.
        </p>
      </div>
    </div>
  )
}
