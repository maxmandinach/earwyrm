import SwiftUI

/// Drop-in artwork section for EditLyricView.
/// Shows gallery carousel with generate pill, and manages sheet presentations.
struct ArtworkSectionView: View {
    let lyric: Lyric
    let noteContent: String
    @Bindable var viewModel: ArtGalleryViewModel
    var onNoteSaved: ((String) -> Void)?
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(AuthManager.self) private var auth
    @State private var showPaywall = false
    @State private var showGenSheet = false
    @State private var freeGenExhausted = false

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            ArtGalleryStrip(
                viewModel: viewModel,
                onGenerate: { handleArtAction() },
                isGenerating: viewModel.isGeneratingArt,
                isLocked: !subscriptionManager.isPlus && !viewModel.hasAIArt && freeGenExhausted
            )

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
        .sheet(isPresented: $showGenSheet) {
            ArtGenerationSheet(
                isPlus: subscriptionManager.isPlus,
                hasExistingArt: viewModel.hasAIArt,
                existingNote: noteContent.isEmpty ? nil : noteContent,
                artRemaining: viewModel.artRemaining,
                onGenerate: { note, refinement in
                    performGenerate(note: note, refinement: refinement)
                },
                onShowPaywall: { showPaywall = true }
            )
            .presentationDetents([subscriptionManager.isPlus ? .medium : .height(noteContent.isEmpty ? 370 : 220)])
            .presentationDragIndicator(.visible)
            .presentationBackground(Theme.background)
        }
    }

    private func handleArtAction() {
        let action = viewModel.resolveAction(isPlus: subscriptionManager.isPlus, freeGenExhausted: freeGenExhausted)
        switch action {
        case .showGenSheet:
            showGenSheet = true
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
            // Save note to lyric_notes if one was provided
            if let note, !note.isEmpty, let userId = auth.userId {
                let insert = NoteInsert(lyricId: lyric.id, userId: userId, content: note, isPublic: false)
                try? await supabase.from("lyric_notes").upsert(insert).execute()
                onNoteSaved?(note)
            }
        }
    }
}
