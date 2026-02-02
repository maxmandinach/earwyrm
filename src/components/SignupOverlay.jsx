import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isValidUsername } from '../lib/utils'

const PROMPTS = {
  resonate: 'Create an account to resonate with lyrics that move you',
  comment: 'Create an account to join the conversation',
  save: 'Create an account to save lyrics you want to keep',
  default: 'Create an account to make it yours',
}

export default function SignupOverlay({ intent = 'default', onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [visible, setVisible] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!isValidUsername(username)) {
      setError('Username: 3-20 characters, letters, numbers, underscores')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    try {
      const { data } = await signUp(email, password, username)

      if (data?.user && !data?.session) {
        setSuccess(true)
      } else {
        handleClose()
        navigate('/home')
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

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-0 sm:items-center"
      onClick={handleClose}
    >
      {/* Backdrop — translucent so the lyric is still visible */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm mx-4 transition-all duration-200 ease-out"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-charcoal/20 hover:text-charcoal/50 transition-colors text-lg leading-none"
        >
          ✕
        </button>

        <div className="p-6 pt-8">
          {success ? (
            <div className="text-center py-4">
              <p className="text-sm text-charcoal mb-2">Check your email to confirm your account</p>
              <p className="text-xs text-charcoal/40">Then come back and sign in as @{username}</p>
              <Link
                to="/login"
                className="inline-block mt-4 text-sm text-charcoal underline hover:no-underline"
              >
                go to login
              </Link>
            </div>
          ) : (
            <>
              {/* Contextual prompt */}
              <p className="text-sm text-charcoal/50 mb-5 text-center">
                {PROMPTS[intent] || PROMPTS.default}
              </p>

              {error && (
                <div className="mb-4 p-2.5 text-xs text-red-700 bg-red-50/80 border border-red-200/60">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center border border-charcoal/15 focus-within:border-charcoal/35">
                  <span className="pl-3 text-charcoal/30 text-sm">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="username"
                    required
                    className="flex-1 px-2 py-2.5 text-sm bg-transparent focus:outline-none
                               placeholder:text-charcoal/25 text-charcoal"
                  />
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  required
                  className="w-full px-3 py-2.5 text-sm bg-transparent border border-charcoal/15
                             focus:border-charcoal/35 focus:outline-none
                             placeholder:text-charcoal/25 text-charcoal"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password (6+ characters)"
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 text-sm bg-transparent border border-charcoal/15
                             focus:border-charcoal/35 focus:outline-none
                             placeholder:text-charcoal/25 text-charcoal"
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 text-sm font-medium text-charcoal
                             border border-charcoal/30 hover:border-charcoal/60
                             disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                >
                  {isLoading ? 'creating...' : 'create account'}
                </button>
              </form>

              <p className="mt-4 text-xs text-charcoal/30 text-center">
                already have an account?{' '}
                <Link to="/login" className="text-charcoal/50 underline hover:no-underline">
                  sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
