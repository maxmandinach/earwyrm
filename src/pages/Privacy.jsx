import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-light text-charcoal tracking-tight mb-8">Privacy Policy</h1>

        <div className="space-y-6 text-sm text-charcoal leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">What We Collect</h2>
            <p className="text-charcoal-light">
              We collect your email address and password for account authentication, and the lyrics
              you choose to save. That's it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">How We Store Your Data</h2>
            <p className="text-charcoal-light">
              All data is securely stored using Supabase, a trusted database provider. Your password
              is encrypted and never stored in plain text.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Sharing Your Information</h2>
            <p className="text-charcoal-light">
              We don't share, sell, or distribute your personal information to third parties. Your
              email and private lyrics remain private. Only lyrics you explicitly mark as public
              can be viewed by others.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Cookies</h2>
            <p className="text-charcoal-light">
              We use essential cookies for authentication to keep you logged in. No tracking or
              advertising cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Your Rights</h2>
            <p className="text-charcoal-light">
              You can request deletion of your account and all associated data at any time by
              contacting us or using the account deletion option in settings.
            </p>
          </section>

          <section className="pt-4">
            <p className="text-xs text-charcoal-light/60">
              Last updated: January 2026
            </p>
          </section>
        </div>

        <Link
          to="/"
          className="inline-block mt-12 text-sm text-charcoal-light hover:text-charcoal transition-colors"
        >
          ← Back
        </Link>
      </div>
    </div>
  )
}
