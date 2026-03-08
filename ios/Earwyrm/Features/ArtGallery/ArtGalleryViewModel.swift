import SwiftUI

/// Single source of truth for art gallery state per lyric.
/// Used by ShareModalView, EditLyricView, and ArtworkSectionView.
@Observable
@MainActor
final class ArtGalleryViewModel {
    enum CardStyle: Equatable {
        case none
        case coverArt
        case aiVariant(Int)
    }

    var variants: [(variant: CardArtService.Variant, image: UIImage)] = []
    var selectedStyle: CardStyle = .none
    private(set) var isGeneratingArt = false
    var aiArtError: String?
    var artRemaining: Int?
    var needsUpgrade = false
    var wasFreeTierGen = false

    // Cover art state
    var coverArtImage: UIImage?
    var coverArtUrl: String?

    /// The currently active image based on selectedStyle.
    var activeImage: UIImage? {
        switch selectedStyle {
        case .none:
            return nil
        case .coverArt:
            return coverArtImage
        case .aiVariant(let index):
            guard index < variants.count else { return nil }
            return variants[index].image
        }
    }

    /// The URL of the currently active art.
    var activeUrl: String? {
        switch selectedStyle {
        case .none:
            return nil
        case .coverArt:
            return coverArtUrl
        case .aiVariant(let index):
            guard index < variants.count else { return nil }
            return variants[index].variant.imageUrl
        }
    }

    /// Backward-compatible: delegates to activeImage.
    var aiArtImage: UIImage? { activeImage }

    /// The URL of the currently selected AI variant (backward compat).
    var activeVariantUrl: String? { activeUrl }

    /// Index into AI variants array (backward compat for ArtGalleryStrip).
    var activeVariantIndex: Int {
        get {
            if case .aiVariant(let i) = selectedStyle { return i }
            return -1
        }
        set {
            selectedStyle = .aiVariant(newValue)
        }
    }

    var hasAIArt: Bool {
        !variants.isEmpty
    }

    var hasAnyArt: Bool {
        hasAIArt || coverArtImage != nil
    }

    /// Fetch all variants for a lyric and download images concurrently.
    func loadVariants(for lyric: Lyric) async {
        coverArtUrl = lyric.coverArtUrl

        // Download cover art and AI variants concurrently
        async let coverArtTask: UIImage? = {
            guard let urlStr = lyric.coverArtUrl, let url = URL(string: urlStr) else { return nil }
            return await CardArtService.downloadImage(from: url)
        }()

        async let variantsTask: [(variant: CardArtService.Variant, image: UIImage)] = {
            let fetchedVariants = await CardArtService.fetchVariants(lyricId: lyric.id)
            guard !fetchedVariants.isEmpty else { return [] }

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
                results.sort { $0.0 < $1.0 }
                loaded = results.compactMap { (_, variant, image) in
                    guard let image else { return nil }
                    return (variant: variant, image: image)
                }
            }
            return loaded
        }()

        let (downloadedCoverArt, loadedVariants) = await (coverArtTask, variantsTask)

        coverArtImage = downloadedCoverArt
        variants = loadedVariants

        // Determine initial selectedStyle from lyric.cardArtUrl
        if let cardArtUrl = lyric.cardArtUrl {
            if cardArtUrl == lyric.coverArtUrl {
                selectedStyle = .coverArt
            } else if let aiIndex = variants.firstIndex(where: { $0.variant.imageUrl == cardArtUrl }) {
                selectedStyle = .aiVariant(aiIndex)
            } else if !variants.isEmpty {
                selectedStyle = .aiVariant(0)
            } else if coverArtImage != nil {
                selectedStyle = .coverArt
            } else {
                selectedStyle = .none
            }
        } else {
            selectedStyle = .none
        }
    }

    /// Generate new art, prepend to variants, select it.
    func generate(lyric: Lyric, note: String?, refinement: String? = nil) async {
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
                selectedStyle = .aiVariant(0)
            }

            Analytics.track(.aiArtGenerated)
        } catch CardArtService.CardArtError.upgradeRequired {
            needsUpgrade = true
        } catch {
            aiArtError = error.localizedDescription
            print("AI art generation failed: \(error)")
        }

        isGeneratingArt = false
    }

    /// Persist the active art selection.
    func persistActiveVariant(lyricId: UUID) async {
        switch selectedStyle {
        case .none:
            await CardArtService.clearActiveVariant(lyricId: lyricId)
        case .coverArt:
            if let url = coverArtUrl {
                await CardArtService.setActiveVariant(lyricId: lyricId, imageUrl: url)
            }
        case .aiVariant(let index):
            guard index < variants.count else { return }
            let url = variants[index].variant.imageUrl
            await CardArtService.setActiveVariant(lyricId: lyricId, imageUrl: url)
        }
    }

    /// Determine what action to take based on subscription status and existing art.
    enum ArtAction {
        case showGenSheet
        case showPaywall
    }

    func resolveAction(isPlus: Bool, freeGenExhausted: Bool) -> ArtAction {
        // Free user who already used their gen or has existing art → paywall
        if !isPlus && (freeGenExhausted || wasFreeTierGen || hasAIArt) {
            return .showPaywall
        }
        // Everyone else gets the generation sheet (note entry + optional art direction)
        return .showGenSheet
    }
}
