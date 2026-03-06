import SwiftUI

/// Single source of truth for art gallery state per lyric.
/// Used by ShareModalView, EditLyricView, and ArtworkSectionView.
@Observable
@MainActor
final class ArtGalleryViewModel {
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

    /// Fetch all variants for a lyric and download images concurrently.
    func loadVariants(for lyric: Lyric) async {
        let fetchedVariants = await CardArtService.fetchVariants(lyricId: lyric.id)
        guard !fetchedVariants.isEmpty else { return }

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

        variants = loaded

        // Set active index to the variant matching card_art_url
        if let cardArtUrl = lyric.cardArtUrl {
            activeVariantIndex = variants.firstIndex(where: { $0.variant.imageUrl == cardArtUrl }) ?? 0
        } else {
            activeVariantIndex = 0
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
                activeVariantIndex = 0
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

    /// Persist the active variant selection if it changed.
    func persistActiveVariant(lyricId: UUID) async {
        guard let activeUrl = activeVariantUrl else { return }
        await CardArtService.setActiveVariant(lyricId: lyricId, imageUrl: activeUrl)
    }

    /// Determine what action to take based on subscription status and existing art.
    enum ArtAction {
        case generate
        case showFreeGenSheet
        case showRegenSheet
        case showPaywall
    }

    func resolveAction(isPlus: Bool, freeGenExhausted: Bool) -> ArtAction {
        // Free user who already used their gen or has existing art → paywall
        if !isPlus && (freeGenExhausted || wasFreeTierGen || hasAIArt) {
            return .showPaywall
        }
        if hasAIArt {
            // Plus user with existing art → regen sheet
            return .showRegenSheet
        } else if !isPlus {
            // Free user, no art yet → free gen confirm
            return .showFreeGenSheet
        } else {
            // Plus user, no art yet → generate directly
            return .generate
        }
    }
}
