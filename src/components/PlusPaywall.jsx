import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { createCheckoutSession } from '../lib/card-art'
import { supabase } from '../lib/supabase-wrapper'

export default function PlusPaywall({ context, onClose }) {
  useAuth()
  const [loading, setLoading] = useState(null) // 'monthly' | 'yearly' | null
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  async function handleSubscribe(plan) {
    setLoading(plan)
    setError('')

    try {
      const session = await supabase.auth.getSession()
      const accessToken = session?.data?.session?.access_token
      if (!accessToken) throw new Error('Not signed in')

      const checkoutUrl = await createCheckoutSession(plan, accessToken)
      window.location.href = checkoutUrl
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setLoading(null)
    }
  }

  const features = [
    { icon: '✦', title: 'AI-generated lyric art', desc: 'Personalized artwork for every lyric' },
    { icon: '◫', title: 'Custom collections', desc: 'Free tier includes favorites only' },
    { icon: 'e+', isBadge: true, title: 'Plus badge on your profile', desc: 'Show your support everywhere' },
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center md:justify-center transition-opacity duration-250"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${visible ? 0.5 : 0})`,
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-sm rounded-t-2xl md:rounded-lg transition-all duration-250 ease-out"
        style={{
          maxHeight: '85vh',
          overflow: 'auto',
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(2rem)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-charcoal/20" />
        </div>

        <div style={{ padding: '2rem 1.5rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--accent, #B8A99A)',
                marginBottom: '0.5rem',
              }}
            >
              earwyrm+
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #6B635A)' }}>
              support earwyrm & unlock everything
            </p>
            {context === 'ai_art' && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9E9589)', marginTop: '0.25rem' }}>
                You've used your free artwork
              </p>
            )}
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {features.map(({ icon, isBadge, title, desc }) => (
              <div
                key={title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem',
                  backgroundColor: 'var(--surface-bg, #FAF8F5)',
                  borderRadius: '12px',
                }}
              >
                <span style={{
                  fontSize: isBadge ? '1.5rem' : '1.25rem',
                  width: '2rem',
                  textAlign: 'center',
                  color: isBadge ? 'var(--color-charcoal-muted, #9C948A)' : 'var(--accent, #B8A99A)',
                  fontFamily: isBadge ? "'Caveat', cursive" : 'inherit',
                  fontWeight: isBadge ? 600 : 'inherit',
                }}>
                  {icon}
                </span>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary, #2C2825)' }}>
                    {title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9E9589)' }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {loading && (
              <div style={{
                textAlign: 'center',
                padding: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted, #9E9589)',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                redirecting to checkout...
                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
              </div>
            )}
            <button
              onClick={() => handleSubscribe('monthly')}
              disabled={!!loading}
              style={{
                width: '100%',
                padding: '0.875rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--surface-bg, #FAF8F5)',
                border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
                borderRadius: '14px',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? (loading === 'monthly' ? 1 : 0.5) : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary, #2C2825)' }}>
                  Monthly
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9E9589)' }}>per month</div>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary, #2C2825)' }}>
                $2.99
              </div>
            </button>

            <button
              onClick={() => handleSubscribe('yearly')}
              disabled={!!loading}
              style={{
                width: '100%',
                padding: '0.875rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--accent, #B8A99A)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? (loading === 'yearly' ? 1 : 0.5) : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Yearly</span>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    padding: '0.125rem 0.5rem',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '999px',
                  }}>
                    save 30%
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>per year</div>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                $24.99
              </div>
            </button>
          </div>

          {error && (
            <p style={{ fontSize: '0.75rem', color: '#c44', textAlign: 'center', marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}

          {/* Cancel */}
          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: '0.625rem',
              fontSize: '0.875rem',
              color: 'var(--text-muted, #9E9589)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
