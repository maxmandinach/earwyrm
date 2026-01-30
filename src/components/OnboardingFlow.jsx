import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import LyricForm from './LyricForm'
import LyricCard from './LyricCard'

export default function OnboardingFlow({ onComplete }) {
  const { updateProfile } = useAuth()
  const { setLyric } = useLyric()
  const [step, setStep] = useState(0) // 0: welcome, 1: first lyric, 2: discovery
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sampleLyrics, setSampleLyrics] = useState([])

  async function handleSubmitLyric(data) {
    setIsLoading(true)
    setError(null)
    try {
      await setLyric(data)
      await finishOnboarding()
    } catch (err) {
      setError(err.message || 'Failed to save lyric')
      setIsLoading(false)
    }
  }

  async function handleSkip() {
    await finishOnboarding()
  }

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
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <p
          className="text-xl text-charcoal/60 mb-8 text-center"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          What lyric is stuck in your head?
        </p>
        <LyricForm onSubmit={handleSubmitLyric} isLoading={isLoading} error={error} />
        <button
          onClick={handleSkip}
          className="mt-8 text-sm text-charcoal/30 hover:text-charcoal/50 transition-colors"
        >
          Just here to browse? Skip this →
        </button>
      </div>
    )
  }

  return null
}
