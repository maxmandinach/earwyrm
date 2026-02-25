import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'

export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [confirmed, setConfirmed] = useState(false)

  // Try to exchange PKCE code for session
  // If it fails (e.g. signup on iOS, confirming on desktop), the email is
  // still confirmed server-side — just show a success message instead.
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      // Try code exchange, but also set a timeout — if the exchange hangs
      // or fails, the email is still confirmed server-side by Supabase
      const timeout = setTimeout(() => setConfirmed(true), 5000)
      supabase.auth.exchangeCodeForSession(code)
        .then(() => clearTimeout(timeout))
        .catch(() => {
          clearTimeout(timeout)
          setConfirmed(true)
        })
    } else {
      // No code parameter — show confirmed (user likely already verified)
      setConfirmed(true)
    }
  }, [searchParams])

  useEffect(() => {
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
      navigate('/home', { replace: true })
      return
    }
  }, [user, loading, navigate])

  // Code exchange failed but email was confirmed server-side
  if (confirmed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <h1
            className="text-3xl mb-4"
            style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-primary, #2C2825)' }}
          >
            you're confirmed!
          </h1>
          <p className="text-sm text-charcoal/50 mb-8">
            Your email has been verified. Head back to the app to sign in.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 text-sm font-medium text-charcoal
                       border border-charcoal/30 hover:border-charcoal/60 transition-colors lowercase"
          >
            sign in
          </Link>
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
