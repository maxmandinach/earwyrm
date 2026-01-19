import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-light text-charcoal tracking-tight mb-8">Terms of Service</h1>

        <div className="space-y-6 text-sm text-charcoal leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Your Content</h2>
            <p className="text-charcoal-light">
              You retain ownership of all lyrics and content you share on earwyrm. By using this
              service, you grant us permission to store and display your content as needed to
              operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">User Responsibility</h2>
            <p className="text-charcoal-light">
              You are responsible for the content you post. We are not responsible for user-generated
              content and do not endorse or verify the accuracy of lyrics shared by users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Account Termination</h2>
            <p className="text-charcoal-light">
              We reserve the right to suspend or terminate accounts that violate these terms or
              engage in abusive behavior. You may delete your account at any time through settings.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Service "As Is"</h2>
            <p className="text-charcoal-light">
              earwyrm is provided "as is" without warranties of any kind. We strive to keep the
              service running smoothly but cannot guarantee uninterrupted access.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Limitation of Liability</h2>
            <p className="text-charcoal-light">
              To the fullest extent permitted by law, earwyrm shall not be liable for any indirect,
              incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Changes to Terms</h2>
            <p className="text-charcoal-light">
              We may update these terms from time to time. Continued use of the service constitutes
              acceptance of any changes.
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
