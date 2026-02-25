import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'

export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Try to exchange PKCE code for session (works when confirming on same device)
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        // Expected to fail on cross-device (e.g. signup on iOS, confirm on desktop)
      })
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

  // If code exchange succeeded and user is logged in, go home
  useEffect(() => {
    if (loading) return
    if (user) {
      navigate('/home', { replace: true })
    }
  }, [user, loading, navigate])

  // Email is always already confirmed by the time we reach this page —
  // Supabase verifies server-side before redirecting here.
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
