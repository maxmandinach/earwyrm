export default function DigestExplanation({ onClose }) {
  return (
    <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-cream max-w-md w-full">
        {/* Header */}
        <div className="border-b border-charcoal/10 px-6 py-5">
          <h2 className="text-lg font-light text-charcoal tracking-tight">
            What's the Weekly Digest?
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-charcoal leading-relaxed">
            Every Sunday morning, we publish a curated collection of 15-20 lyrics that were shared during the previous week.
          </p>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-charcoal mb-1">Anonymous</p>
              <p className="text-xs text-charcoal-light leading-relaxed">
                No usernames, no profile links. Just the lyric, the song, and when it was shared.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-charcoal mb-1">Random Selection</p>
              <p className="text-xs text-charcoal-light leading-relaxed">
                We randomly choose from all public lyrics. Everyone has an equal chance of being featured.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-charcoal mb-1">Weekly Refresh</p>
              <p className="text-xs text-charcoal-light leading-relaxed">
                New digest every Sunday. No infinite scrolling, no algorithmic feed—just one curated "issue" per week.
              </p>
            </div>
          </div>

          <div className="bg-charcoal/5 px-4 py-3 border-l-2 border-charcoal/20 mt-6">
            <p className="text-xs text-charcoal-light leading-relaxed">
              Think of it as a weekly magazine of moments that moved people—a way to discover new music through the lines that resonated.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-charcoal/10 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-charcoal border border-charcoal/30
                     hover:border-charcoal/60 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
