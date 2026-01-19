import { useState } from 'react'
import { Link } from 'react-router-dom'
import DigestIntroModal from '../components/DigestIntroModal'
import DigestExplanation from '../components/DigestExplanation'

// Mock lyric for testing
const mockLyric = {
  content: 'And I know that you mean so well, but I am not a vessel for your good intent',
  song_title: 'Liability',
  artist_name: 'Lorde',
  theme: 'default'
}

export default function DigestTest() {
  const [showIntroModal, setShowIntroModal] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [lastChoice, setLastChoice] = useState(null)

  const handleOptIn = (includeInDigest, rememberChoice) => {
    setLastChoice({
      includeInDigest,
      rememberChoice,
      timestamp: new Date().toLocaleTimeString()
    })
  }

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-light text-charcoal tracking-tight">
            Weekly Digest - Component Testing
          </h1>
          <Link
            to="/"
            className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
          >
            Home
          </Link>
        </div>

        <div className="space-y-8">
          {/* Intro Modal Test */}
          <section className="border border-charcoal/20 p-6">
            <h2 className="text-lg font-medium text-charcoal mb-4">
              1. Digest Intro Modal
            </h2>
            <p className="text-sm text-charcoal-light mb-4">
              This modal appears after a user shares their first lyric. It shows a preview of how
              their lyric would appear in the digest and lets them opt in.
            </p>
            <button
              onClick={() => setShowIntroModal(true)}
              className="px-6 py-2 text-sm font-medium text-charcoal border border-charcoal/30
                       hover:border-charcoal/60 transition-colors"
            >
              Show Intro Modal
            </button>

            {lastChoice && (
              <div className="mt-4 p-3 bg-charcoal/5 border-l-2 border-charcoal/30">
                <p className="text-xs text-charcoal-light">
                  <strong>Last choice ({lastChoice.timestamp}):</strong><br />
                  Include in digest: {lastChoice.includeInDigest ? 'Yes' : 'No'}<br />
                  Remember choice: {lastChoice.rememberChoice ? 'Yes' : 'No'}
                </p>
              </div>
            )}
          </section>

          {/* Explanation Modal Test */}
          <section className="border border-charcoal/20 p-6">
            <h2 className="text-lg font-medium text-charcoal mb-4">
              2. Digest Explanation Modal
            </h2>
            <p className="text-sm text-charcoal-light mb-4">
              This modal appears when users click "What's this?" links. It explains what the weekly
              digest is without requiring opt-in.
            </p>
            <button
              onClick={() => setShowExplanation(true)}
              className="px-6 py-2 text-sm font-medium text-charcoal border border-charcoal/30
                       hover:border-charcoal/60 transition-colors"
            >
              Show Explanation
            </button>
          </section>

          {/* Digest Page Link */}
          <section className="border border-charcoal/20 p-6">
            <h2 className="text-lg font-medium text-charcoal mb-4">
              3. Weekly Digest Page
            </h2>
            <p className="text-sm text-charcoal-light mb-4">
              The actual digest view that users see. Currently using mock data with 10 sample lyrics
              across different themes.
            </p>
            <Link
              to="/digest"
              className="inline-block px-6 py-2 text-sm font-medium text-charcoal border border-charcoal/30
                       hover:border-charcoal/60 transition-colors"
            >
              View Digest Page
            </Link>
          </section>

          {/* Implementation Notes */}
          <section className="border border-charcoal/20 p-6 bg-charcoal/5">
            <h2 className="text-lg font-medium text-charcoal mb-4">
              Implementation Notes
            </h2>
            <div className="space-y-3 text-sm text-charcoal-light">
              <p>
                <strong>Navigation:</strong> "This Week" link has been added to the header navigation
              </p>
              <p>
                <strong>Route:</strong> /digest is now active and shows mock data
              </p>
              <p>
                <strong>Database:</strong> Needs `include_in_digest` column on lyrics table +
                `weekly_digests` table (see WEEKLY_DIGEST_IMPLEMENTATION.md)
              </p>
              <p>
                <strong>Backend:</strong> Needs cron job to generate digests weekly
                (see implementation guide)
              </p>
              <p>
                <strong>Integration:</strong> LyricForm needs to be updated to show digest toggle
                (see LyricFormWithDigest.jsx for example)
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {showIntroModal && (
        <DigestIntroModal
          lyric={mockLyric}
          onClose={() => setShowIntroModal(false)}
          onOptIn={handleOptIn}
        />
      )}

      {showExplanation && (
        <DigestExplanation
          onClose={() => setShowExplanation(false)}
        />
      )}
    </div>
  )
}
