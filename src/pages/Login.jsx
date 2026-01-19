import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-2xl font-medium text-charcoal mb-8">Sign in</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        {error && (
          <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3 bg-transparent border border-charcoal/20
                       focus:border-charcoal/40 focus:outline-none
                       placeholder:text-charcoal-light/50 text-charcoal"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 bg-transparent border border-charcoal/20
                       focus:border-charcoal/40 focus:outline-none
                       placeholder:text-charcoal-light/50 text-charcoal"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full py-3 text-sm font-medium text-charcoal
                     border border-charcoal/30 hover:border-charcoal/60
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 text-sm text-charcoal-light">
        Don't have an account?{' '}
        <Link to="/signup" className="text-charcoal underline hover:no-underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
