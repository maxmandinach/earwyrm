import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-light text-charcoal tracking-tight mb-8">Terms of Service</h1>

        <div className="space-y-6 text-sm text-charcoal leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Your Content</h2>
            <p className="text-charcoal/40">
              You retain ownership of all original content you create on earwyrm, including personal notes
              and reflections. By using this service, you grant us permission to store and display your
              content as needed to operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Song Lyrics & Copyright</h2>
            <p className="text-charcoal/40">
              Song lyrics are the copyrighted property of their respective owners (songwriters, publishers,
              and rights holders). Earwyrm does not claim ownership of any song lyrics. Users share short
              excerpts of lyrics as part of personal expression and commentary. You are responsible for
              ensuring your use of lyrics is lawful. Earwyrm does not provide, curate, or endorse
              any lyric content — all lyrics on earwyrm are posted by users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">DMCA & Copyright Takedowns</h2>
            <p className="text-charcoal/40">
              Earwyrm respects intellectual property rights and complies with the Digital Millennium
              Copyright Act (DMCA). If you believe content on earwyrm infringes your copyright, please
              review our{' '}
              <a href="/dmca.html" className="underline hover:text-charcoal transition-colors">
                DMCA Policy
              </a>{' '}
              for instructions on submitting a takedown notice. We will respond promptly to valid notices
              and may terminate accounts of repeat infringers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">AI-Generated Art</h2>
            <p className="text-charcoal/40">
              Earwyrm offers AI-generated card art as a feature. AI-generated images may not be
              eligible for copyright protection under current law. You are free to use generated art
              within earwyrm, but earwyrm makes no guarantees regarding intellectual property rights
              over AI-generated content. AI art is generated using third-party services and is subject
              to their terms of use.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">User Responsibility</h2>
            <p className="text-charcoal/40">
              You are responsible for the content you post. We are not responsible for user-generated
              content and do not endorse or verify the accuracy of lyrics shared by users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Subscriptions & Payments</h2>
            <p className="text-charcoal/40">
              Earwyrm+ is an optional paid subscription that provides additional features. Subscriptions
              are billed through Apple's App Store or the web and are subject to their respective refund
              policies. You may cancel your subscription at any time through your account settings.
              Cancellation takes effect at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Account Termination</h2>
            <p className="text-charcoal/40">
              We reserve the right to suspend or terminate accounts that violate these terms or
              engage in abusive behavior. You may delete your account at any time through settings.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Service "As Is"</h2>
            <p className="text-charcoal/40">
              earwyrm is provided "as is" without warranties of any kind. We strive to keep the
              service running smoothly but cannot guarantee uninterrupted access.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Limitation of Liability</h2>
            <p className="text-charcoal/40">
              To the fullest extent permitted by law, earwyrm shall not be liable for any indirect,
              incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-charcoal mb-3">Changes to Terms</h2>
            <p className="text-charcoal/40">
              We may update these terms from time to time. Continued use of the service constitutes
              acceptance of any changes.
            </p>
          </section>

          <section className="pt-4">
            <p className="text-xs text-charcoal/30">
              Last updated: March 2026
            </p>
          </section>
        </div>

        <Link
          to="/"
          className="inline-block mt-12 text-sm text-charcoal/40 hover:text-charcoal transition-colors"
        >
          ← Back
        </Link>
      </div>
    </div>
  )
}
