import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isValidUsername } from '../lib/utils'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const { data } = await signUp(email, password, username)

      // Check if email confirmation is required
      if (data?.user && !data?.session) {
        setSuccess(true)
        setError('Please check your email to confirm your account before logging in.')
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

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-2xl font-light text-charcoal mb-8 lowercase">account created!</h1>

        <div className="w-full max-w-sm">
          <div className="mb-6 p-4 text-sm text-green-800 bg-green-50 border border-green-200">
            Your account has been successfully created for <strong>@{username}</strong>.
            {error ? (
              <div className="mt-2 pt-2 border-t border-green-300">
                {error}
              </div>
            ) : (
              <div className="mt-2">
                You can now log in with your credentials.
              </div>
            )}
          </div>

          <Link
            to="/login"
            className="block w-full py-3 text-sm font-medium text-center text-charcoal
                       border border-charcoal/30 hover:border-charcoal/60 transition-colors lowercase"
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
              <span className="pl-4 text-charcoal-light">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                required
                className="flex-1 px-2 py-3 bg-transparent focus:outline-none
                           placeholder:text-charcoal-light/50 text-charcoal"
              />
            </div>
            <p className="mt-1 text-xs text-charcoal-light">
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
                       placeholder:text-charcoal-light/50 text-charcoal"
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
                           placeholder:text-charcoal-light/50 text-charcoal"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-light hover:text-charcoal"
              >
                {showPassword ? 'hide' : 'show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-charcoal-light">
              At least 6 characters
            </p>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="confirm password"
              required
              minLength={6}
              className="w-full px-4 py-3 pr-20 bg-transparent border border-charcoal/20
                         focus:border-charcoal/40 focus:outline-none
                         placeholder:text-charcoal-light/50 text-charcoal"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-light hover:text-charcoal"
            >
              {showConfirmPassword ? 'hide' : 'show'}
            </button>
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
      </form>

      <p className="mt-8 text-sm text-charcoal-light">
        already have an account?{' '}
        <Link to="/login" className="text-charcoal underline hover:no-underline">
          sign in
        </Link>
      </p>
    </div>
  )
}
