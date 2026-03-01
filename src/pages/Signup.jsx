import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isValidUsername } from '../lib/utils'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [confirmationEmail, setConfirmationEmail] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isValidUsername(username)) {
      setError('Username must be 3-20 characters, letters, numbers, and underscores only')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const { data } = await signUp(email, password, username)

      // Check if email confirmation is required
      if (data?.user && !data?.session) {
        setConfirmationEmail(email)
      } else {
        // Auto-logged in, redirect to home
        navigate('/')
      }
    } catch (err) {
      if (err.message?.includes('duplicate key')) {
        setError('Username is already taken')
      } else {
        setError(err.message || 'Failed to create account')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (confirmationEmail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <h1
          className="text-3xl text-charcoal mb-6"
          style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
        >
          check your email
        </h1>

        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-charcoal/60 mb-2 leading-relaxed">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-medium text-charcoal mb-6">
            {confirmationEmail}
          </p>
          <p className="text-sm text-charcoal/40 mb-8 leading-relaxed">
            Tap the link in your email to activate your account, then come back here to sign in.
          </p>

          <Link
            to="/login"
            className="inline-block px-8 py-3 text-sm font-medium transition-colors lowercase"
            style={{
              backgroundColor: 'var(--text-primary, #2C2825)',
              color: 'var(--surface-bg, #FAF8F5)',
            }}
          >
            go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-2xl font-light text-charcoal mb-8 lowercase">create an account</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        {error && (
          <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex items-center border border-charcoal/20 focus-within:border-charcoal/40">
              <span className="pl-4 text-charcoal/30">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                required
                className="flex-1 px-2 py-3 bg-transparent focus:outline-none
                           placeholder:text-charcoal/30 text-charcoal"
              />
            </div>
            <p className="mt-1 text-xs text-charcoal/30">
              This will be your public URL: earwyrm.app/@{username || 'username'}
            </p>
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            required
            className="w-full px-4 py-3 bg-transparent border border-charcoal/20
                       focus:border-charcoal/40 focus:outline-none
                       placeholder:text-charcoal/30 text-charcoal"
          />

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                required
                minLength={6}
                className="w-full px-4 py-3 pr-20 bg-transparent border border-charcoal/20
                           focus:border-charcoal/40 focus:outline-none
                           placeholder:text-charcoal/30 text-charcoal"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal/40 hover:text-charcoal"
              >
                {showPassword ? 'hide' : 'show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-charcoal/30">
              At least 6 characters
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full py-3 text-sm font-medium text-charcoal
                     border border-charcoal/30 hover:border-charcoal/60
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          {isLoading ? 'creating account...' : 'create account'}
        </button>

        <p className="mt-4 text-xs text-charcoal/30 text-center leading-relaxed">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-charcoal/50">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="underline hover:text-charcoal/50">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-8 text-sm text-charcoal/40">
        already have an account?{' '}
        <Link to="/login" className="text-charcoal underline hover:no-underline">
          sign in
        </Link>
      </p>
    </div>
  )
}
