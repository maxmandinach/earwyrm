import SwiftUI

@Observable
@MainActor
final class ShareImageRenderer {
    var format: ShareFormat = .square
    var theme: ShareTheme = .light
    var style: ShareStyle = .minimal
    var emphasis: ShareEmphasis = .lyricOnly
    var renderedImage: UIImage?

    private(set) var isRendering = false
    private var cachedCoverArt: UIImage?
    private var cachedCoverArtUrl: String?

    // AI art gallery
    var variants: [(variant: CardArtService.Variant, image: UIImage)] = []
    var activeVariantIndex: Int = 0
    private(set) var isGeneratingArt = false
    var aiArtError: String?
    var artRemaining: Int?
    var needsUpgrade = false
    var wasFreeTierGen = false

    /// The currently selected AI art image (if any).
    var aiArtImage: UIImage? {
        guard !variants.isEmpty, activeVariantIndex < variants.count else { return nil }
        return variants[activeVariantIndex].image
    }

    /// The URL of the currently selected variant.
    var activeVariantUrl: String? {
        guard !variants.isEmpty, activeVariantIndex < variants.count else { return nil }
        return variants[activeVariantIndex].variant.imageUrl
    }

    var hasAIArt: Bool {
        !variants.isEmpty
    }

    func render(lyric: Lyric, note: String?, username: String?) {
        isRendering = true

        let view = ShareImageView(
            content: lyric.content,
            noteContent: note,
            songTitle: lyric.songTitle,
            artistName: lyric.artistName,
            coverArtImage: cachedCoverArt,
            aiArtImage: aiArtImage,
            username: username,
            format: format,
            theme: theme,
            style: style,
            emphasis: emphasis
        )

        let renderer = ImageRenderer(content: view)
        renderer.scale = 3.0
        renderer.proposedSize = .init(format.size)

        renderedImage = renderer.uiImage
        isRendering = false
    }

    func initialRender(lyric: Lyric, note: String?, username: String?) async {
        if let urlString = lyric.coverArtUrl, urlString != cachedCoverArtUrl {
            cachedCoverArt = await downloadImage(from: urlString)
            cachedCoverArtUrl = urlString
        }

        // Fetch all art variants for this lyric
        let fetchedVariants = await CardArtService.fetchVariants(lyricId: lyric.id)
        if !fetchedVariants.isEmpty {
            // Download all variant images concurrently
            var loaded: [(variant: CardArtService.Variant, image: UIImage)] = []
            await withTaskGroup(of: (Int, CardArtService.Variant, UIImage?).self) { group in
                for (index, variant) in fetchedVariants.enumerated() {
                    group.addTask {
                        guard let url = URL(string: variant.imageUrl) else { return (index, variant, nil) }
                        let image = await CardArtService.downloadImage(from: url)
                        return (index, variant, image)
                    }
                }
                var results: [(Int, CardArtService.Variant, UIImage?)] = []
                for await result in group {
                    results.append(result)
                }
                // Sort by original order (most recent first)
                results.sort { $0.0 < $1.0 }
                loaded = results.compactMap { (_, variant, image) in
                    guard let image else { return nil }
                    return (variant: variant, image: image)
                }
            }

            variants = loaded

            // Set active index to the variant matching card_art_url
            if let cardArtUrl = lyric.cardArtUrl {
                activeVariantIndex = variants.firstIndex(where: { $0.variant.imageUrl == cardArtUrl }) ?? 0
            } else {
                activeVariantIndex = 0
            }

            if !variants.isEmpty {
                style = .aiArt
            }
        }

        render(lyric: lyric, note: note, username: username)
    }

    func generateAIArt(lyric: Lyric, note: String?, username: String?, refinement: String? = nil) async {
        isGeneratingArt = true
        aiArtError = nil
        needsUpgrade = false
        wasFreeTierGen = false

        do {
            let result = try await CardArtService.generateArt(lyric: lyric, note: note, refinement: refinement)
            artRemaining = result.remaining
            wasFreeTierGen = result.isFreeTier
            let image = await CardArtService.downloadImage(from: result.url)

            if let image {
                let newVariant = CardArtService.Variant(
                    id: UUID(),
                    imageUrl: result.url.absoluteString,
                    createdAt: Date()
                )
                variants.insert((variant: newVariant, image: image), at: 0)
                activeVariantIndex = 0
            }

            style = .aiArt
            render(lyric: lyric, note: note, username: username)
            Analytics.track(.aiArtGenerated)
        } catch CardArtService.CardArtError.upgradeRequired {
            needsUpgrade = true
        } catch {
            aiArtError = error.localizedDescription
            print("AI art generation failed: \(error)")
        }

        isGeneratingArt = false
    }

    func toggleFormat() {
        format = format == .square ? .story : .square
    }

    func toggleTheme() {
        theme = theme == .light ? .dark : .light
    }

    func toggleStyle() {
        style = style == .minimal ? .coverArt : .minimal
    }

    func hasCoverArt(lyric: Lyric) -> Bool {
        lyric.coverArtUrl != nil
    }

    private func downloadImage(from urlString: String) async -> UIImage? {
        guard let url = URL(string: urlString) else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            return UIImage(data: data)
        } catch {
            print("Failed to download cover art: \(error)")
            return nil
        }
    }
}
