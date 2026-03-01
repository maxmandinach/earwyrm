import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import InterestPicker from './InterestPicker'

export default function OnboardingFlow({ onComplete }) {
  const { updateProfile } = useAuth()
  const [step, setStep] = useState(0) // 0: welcome, 1: interest picker

  async function finishOnboarding() {
    try {
      await updateProfile({ onboarded_at: new Date().toISOString() })
      onComplete()
    } catch (err) {
      console.error('Error completing onboarding:', err)
      // Still proceed even if profile update fails
      onComplete()
    }
  }

  if (step === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        <h1
          className="text-4xl text-charcoal mb-4"
          style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
        >
          Welcome to earwyrm
        </h1>
        <p className="text-charcoal/60 max-w-sm mb-2 leading-relaxed">
          Save the lyrics that stay with you.
          See what resonates with others.
        </p>
        <p className="text-charcoal/40 text-sm max-w-sm mb-8">
          Your journal, your lyrics. Share when you want.
        </p>
        <button
          onClick={() => setStep(1)}
          className="px-8 py-3 text-lg font-medium transition-all"
          style={{
            fontFamily: "'Caveat', cursive",
            backgroundColor: 'var(--text-primary, #2C2825)',
            color: 'var(--surface-bg, #FAF8F5)',
          }}
        >
          Get started
        </button>
      </div>
    )
  }

  if (step === 1) {
    return <InterestPicker onComplete={finishOnboarding} />
  }

  return null
}
