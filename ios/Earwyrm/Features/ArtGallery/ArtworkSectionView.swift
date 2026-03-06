import SwiftUI

/// Drop-in artwork section for EditLyricView.
/// Shows large preview, gallery carousel, generate/regen buttons, and manages sheet presentations.
struct ArtworkSectionView: View {
    let lyric: Lyric
    let noteContent: String
    @Bindable var viewModel: ArtGalleryViewModel
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @State private var showPaywall = false
    @State private var showFreeGenSheet = false
    @State private var showRegenSheet = false
    @State private var freeGenExhausted = false

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            if viewModel.hasAIArt {
                // Gallery carousel + regen button
                HStack(spacing: Theme.Spacing.sm) {
                    // Carousel strip
                    if viewModel.variants.count > 1 {
                        ArtGalleryStrip(viewModel: viewModel)
                    }

                    Spacer()

                    // Regen wand button
                    Button {
                        handleArtAction()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "wand.and.stars")
                                .font(.system(size: 13, weight: .medium))
                            Text(artRemainingLabel("New"))
                                .font(Theme.dmSans(12, weight: .medium))
                        }
                        .foregroundStyle(Theme.accent)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Theme.accent.opacity(0.1))
                        .clipShape(Capsule())
                    }
                    .disabled(viewModel.isGeneratingArt)
                }

                // Generating indicator
                if viewModel.isGeneratingArt {
                    HStack(spacing: 8) {
                        ProgressView()
                            .scaleEffect(0.7)
                            .tint(Theme.accent)
                        Text("generating artwork...")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
            } else {
                // No artwork — generate button
                Button {
                    handleArtAction()
                } label: {
                    HStack(spacing: 6) {
                        if viewModel.isGeneratingArt {
                            ProgressView()
                                .scaleEffect(0.7)
                                .tint(Theme.accent)
                        } else {
                            Image(systemName: "wand.and.stars")
                                .font(.system(size: 13))
                        }
                        Text(viewModel.isGeneratingArt ? "Generating..." : artRemainingLabel("Generate artwork"))
                            .font(Theme.dmSans(13))
                    }
                    .foregroundStyle(Theme.accent)
                }
                .disabled(viewModel.isGeneratingArt)
            }

            if let error = viewModel.aiArtError {
                Text(error)
                    .font(Theme.dmSans(12))
                    .foregroundStyle(.red.opacity(0.7))
            }
        }
        .onChange(of: viewModel.needsUpgrade) { _, needsUpgrade in
            if needsUpgrade {
                freeGenExhausted = true
                Analytics.track(.aiArtPaywallHit)
                showPaywall = true
                viewModel.needsUpgrade = false
            }
        }
        .sheet(isPresented: $showPaywall) {
            EarwyrmPlusPaywall(context: "ai_art")
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showFreeGenSheet) {
            ArtGenerationSheet(
                mode: .firstGen,
                existingNote: noteContent.isEmpty ? nil : noteContent,
                artRemaining: viewModel.artRemaining,
                onGenerate: { note, refinement in
                    performGenerate(note: note, refinement: refinement)
                },
                onShowPaywall: { showPaywall = true }
            )
            .presentationDetents([.height(noteContent.isEmpty ? 370 : 220)])
            .presentationDragIndicator(.visible)
            .presentationBackground(Theme.background)
        }
        .sheet(isPresented: $showRegenSheet) {
            ArtGenerationSheet(
                mode: .regen,
                existingNote: noteContent.isEmpty ? nil : noteContent,
                artRemaining: viewModel.artRemaining,
                onGenerate: { note, refinement in
                    performGenerate(note: note, refinement: refinement)
                },
                onShowPaywall: { showPaywall = true }
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
            .presentationBackground(Theme.background)
        }
    }

    private func handleArtAction() {
        let action = viewModel.resolveAction(isPlus: subscriptionManager.isPlus, freeGenExhausted: freeGenExhausted)
        switch action {
        case .generate:
            performGenerate(note: noteContent.isEmpty ? nil : noteContent, refinement: nil)
        case .showFreeGenSheet:
            showFreeGenSheet = true
        case .showRegenSheet:
            showRegenSheet = true
        case .showPaywall:
            Analytics.track(.aiArtPaywallHit)
            showPaywall = true
        }
    }

    private func performGenerate(note: String?, refinement: String?) {
        if viewModel.hasAIArt {
            Analytics.track(.aiArtRegenerated)
        }
        Task {
            await viewModel.generate(lyric: lyric, note: note, refinement: refinement)
            if viewModel.wasFreeTierGen {
                freeGenExhausted = true
            }
        }
    }

    private func artRemainingLabel(_ prefix: String) -> String {
        if let remaining = viewModel.artRemaining {
            if remaining > 0 {
                return "\(prefix) (\(remaining))"
            }
            return subscriptionManager.isPlus ? "Monthly limit reached" : "Upgrade to regenerate"
        }
        return prefix
    }
}
