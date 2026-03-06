import SwiftUI
import UIKit

struct ShareModalView: View {
    let lyric: Lyric
    let note: LyricNote?
    let username: String?
    var onShareCompleted: (() -> Void)?
    var onNoteSaved: ((String) -> Void)?
    var onArtGenerated: (() -> Void)?

    @State private var renderer = ShareImageRenderer()
    @State private var artVM = ArtGalleryViewModel()
    @State private var showActivitySheet = false
    @State private var copiedLink = false
    @State private var savedPhoto = false
    @State private var showPaywall = false
    @Environment(\.dismiss) private var dismiss
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(AuthManager.self) private var auth

    /// Tracks an inline note saved during this session (overrides passed-in note)
    @State private var savedNoteContent: String?

    private var noteText: String? {
        if let saved = savedNoteContent, !saved.isEmpty { return saved }
        guard let content = note?.content, !content.isEmpty else { return nil }
        return content
    }

    private var shareURL: URL? {
        guard let token = lyric.shareToken else { return nil }
        return URL(string: "https://earwyrm.app/s/\(token)")
    }

    private var hasCoverArt: Bool {
        lyric.coverArtUrl != nil
    }

    /// Whether the free user has exhausted their free generation
    @State private var freeGenExhausted = false
    @State private var showFreeGenConfirm = false
    @State private var showRegenConfirm = false
    @State private var inlineNote = ""
    /// Track the initial variant index to detect changes on dismiss
    @State private var initialVariantIndex: Int?

    /// The style options always include AI Art now
    private var availableStyles: [ShareStyle] {
        var styles: [ShareStyle] = [.minimal]
        if hasCoverArt { styles.append(.coverArt) }
        styles.append(.aiArt)
        return styles
    }

    /// Whether the AI Art tab should show a lock icon
    private var aiArtLocked: Bool {
        !subscriptionManager.isPlus && !artVM.hasAIArt && freeGenExhausted
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                // ── Image Preview ──
                Group {
                    if let image = renderer.renderedImage {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
                    } else {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Theme.card)
                            .aspectRatio(1, contentMode: .fit)
                            .overlay {
                                ProgressView()
                                    .tint(Theme.accent)
                            }
                    }
                }
                .overlay {
                    if artVM.isGeneratingArt {
                        ArtGeneratingOverlay()
                    }
                }
                .frame(maxHeight: 400)

                // AI Art error
                if let error = artVM.aiArtError {
                    Text(error)
                        .font(Theme.dmSans(11))
                        .foregroundStyle(.red.opacity(0.7))
                        .lineLimit(2)
                }

                // ── Art Gallery Strip ──
                if renderer.style == .aiArt && artVM.variants.count > 1 {
                    ArtGalleryStrip(viewModel: artVM) {
                        rerender()
                    }
                }

                // ── Controls ──
                HStack {
                    if availableStyles.count > 1 {
                        stylePicker
                    }

                    Spacer()

                    // Icon toggles
                    HStack(spacing: 8) {
                        // Theme: sun/moon
                        Button {
                            renderer.theme = renderer.theme == .light ? .dark : .light
                            rerender()
                        } label: {
                            Image(systemName: renderer.theme == .light ? "sun.max" : "moon.fill")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Theme.textSecondary)
                                .frame(width: 34, height: 34)
                                .background(Theme.card)
                                .clipShape(Circle())
                                .overlay(Circle().strokeBorder(Theme.dividerColor, lineWidth: 1))
                        }

                        // Emphasis: note toggle (only when note exists)
                        if noteText != nil {
                            Button {
                                renderer.emphasis = renderer.emphasis == .lyricOnly ? .lyricAndNote : .lyricOnly
                                rerender()
                            } label: {
                                Image(systemName: renderer.emphasis == .lyricAndNote ? "note.text" : "text.quote")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(renderer.emphasis == .lyricAndNote ? Theme.accent : Theme.textSecondary)
                                    .frame(width: 34, height: 34)
                                    .background(renderer.emphasis == .lyricAndNote ? Theme.accent.opacity(0.12) : Theme.card)
                                    .clipShape(Circle())
                                    .overlay(Circle().strokeBorder(renderer.emphasis == .lyricAndNote ? Theme.accent.opacity(0.3) : Theme.dividerColor, lineWidth: 1))
                            }
                        }
                    }
                }

                // ── Actions ──
                Button {
                    Analytics.track(.shareActionChosen, ["action": "activity_sheet"])
                    Haptics.success()
                    renderer.format = .square
                    rerender()
                    showActivitySheet = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 16, weight: .medium))
                        Text("Share")
                            .font(Theme.dmSans(16, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Secondary actions
                HStack(spacing: 0) {
                    secondaryButton(
                        icon: savedPhoto ? "checkmark" : "arrow.down.to.line",
                        label: savedPhoto ? "Saved" : "Save to Photos",
                        action: saveToPhotos
                    )

                    dot

                    secondaryButton(
                        icon: copiedLink ? "checkmark" : "link",
                        label: copiedLink ? "Copied" : "Copy link",
                        action: copyLink
                    )
                }
            }
            .padding(.horizontal, Theme.Spacing.lg)
            .background(Theme.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    CaveatText(text: "share", size: 24, weight: .semibold, color: Theme.textPrimary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.textSecondary)
                }
            }
        }
        .task {
            renderer.format = .square
            if hasCoverArt {
                renderer.style = .coverArt
            }
            await renderer.loadCoverArt(for: lyric)
            await artVM.loadVariants(for: lyric)
            if artVM.hasAIArt {
                renderer.style = .aiArt
            }
            initialVariantIndex = artVM.activeVariantIndex
            rerender()
        }
        .onDisappear {
            // Persist active variant if user changed selection
            if let initial = initialVariantIndex,
               artVM.activeVariantIndex != initial {
                Task {
                    await artVM.persistActiveVariant(lyricId: lyric.id)
                    onArtGenerated?()
                }
            }
        }
        .sheet(isPresented: $showActivitySheet) {
            if let image = renderer.renderedImage {
                ShareActivityController(
                    items: shareActivityItems(image: image)
                ) { completed in
                    if completed {
                        onShareCompleted?()
                        dismiss()
                    }
                }
                .presentationDetents([.medium])
            }
        }
        .onChange(of: artVM.needsUpgrade) { _, needsUpgrade in
            if needsUpgrade {
                freeGenExhausted = true
                Analytics.track(.aiArtPaywallHit)
                showPaywall = true
                artVM.needsUpgrade = false
            }
        }
        .sheet(isPresented: $showPaywall) {
            EarwyrmPlusPaywall(context: "ai_art")
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showFreeGenConfirm) {
            ArtGenerationSheet(
                mode: .firstGen,
                existingNote: noteText,
                artRemaining: artVM.artRemaining,
                onGenerate: { note, refinement in
                    // Save inline note if provided via the sheet
                    if let note, noteText == nil {
                        saveInlineNote(note)
                    }
                    performGenerate(refinement: refinement)
                },
                onShowPaywall: { showPaywall = true }
            )
            .presentationDetents([.height(noteText == nil ? 370 : 220)])
            .presentationDragIndicator(.visible)
            .presentationBackground(Theme.background)
        }
        .sheet(isPresented: $showRegenConfirm) {
            ArtGenerationSheet(
                mode: .regen,
                existingNote: noteText,
                artRemaining: artVM.artRemaining,
                onGenerate: { note, refinement in
                    // Save note changes if edited in regen sheet
                    if let note {
                        let noteChanged = note != (noteText ?? "")
                        if noteChanged {
                            saveInlineNote(note)
                        }
                    }
                    performGenerate(refinement: refinement)
                },
                onShowPaywall: { showPaywall = true }
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
            .presentationBackground(Theme.background)
        }
    }

    // MARK: - Style Picker

    private var stylePicker: some View {
        HStack(spacing: 0) {
            ForEach(availableStyles, id: \.self) { option in
                Button {
                    handleStyleTap(option)
                } label: {
                    HStack(spacing: 4) {
                        if option == .aiArt {
                            if aiArtLocked {
                                Image(systemName: "lock.fill")
                                    .font(.system(size: 8, weight: .bold))
                            } else {
                                Text("✦")
                                    .font(.system(size: 10))
                            }
                        }
                        Text(option.label)
                            .font(Theme.dmSans(14, weight: renderer.style == option ? .semibold : .regular))
                            .lineLimit(1)
                            .fixedSize()
                    }
                    .foregroundStyle(renderer.style == option ? Theme.textPrimary : Theme.textMuted)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        renderer.style == option
                            ? Theme.card
                            : Color.clear
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }

            // Regenerate icon — only when AI art exists and we're on AI Art tab
            if renderer.style == .aiArt && artVM.hasAIArt && !artVM.isGeneratingArt {
                Button {
                    handleArtAction()
                } label: {
                    Image(systemName: "wand.and.stars")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Theme.accent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 10)
                }
            }
        }
        .background(Theme.background)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Theme.dividerColor, lineWidth: 1)
        )
    }

    private func handleStyleTap(_ style: ShareStyle) {
        if style == .aiArt {
            if aiArtLocked {
                Analytics.track(.aiArtPaywallHit)
                showPaywall = true
                return
            }
            renderer.style = .aiArt
            rerender()
            if !artVM.hasAIArt && !artVM.isGeneratingArt {
                handleArtAction()
            }
        } else {
            renderer.style = style
            rerender()
        }
    }

    private func handleArtAction() {
        let action = artVM.resolveAction(isPlus: subscriptionManager.isPlus, freeGenExhausted: freeGenExhausted)
        switch action {
        case .generate:
            performGenerate()
        case .showFreeGenSheet:
            showFreeGenConfirm = true
        case .showRegenSheet:
            showRegenConfirm = true
        case .showPaywall:
            Analytics.track(.aiArtPaywallHit)
            showPaywall = true
        }
    }

    /// The effective note for art generation
    private var artNote: String? {
        if let noteText { return noteText }
        let trimmed = inlineNote.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func performGenerate(refinement: String? = nil) {
        if artVM.hasAIArt {
            Analytics.track(.aiArtRegenerated)
        }
        Task {
            await artVM.generate(lyric: lyric, note: artNote, refinement: refinement)
            if artVM.wasFreeTierGen {
                freeGenExhausted = true
            }
            if artVM.hasAIArt {
                renderer.style = .aiArt
                rerender()
                onArtGenerated?()
            }
        }
    }

    private func saveInlineNote(_ content: String) {
        guard let userId = auth.userId else { return }
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        Task {
            let insert = NoteInsert(lyricId: lyric.id, userId: userId, content: trimmed, isPublic: false)
            try? await supabase.from("lyric_notes").upsert(insert).execute()
            savedNoteContent = trimmed
            onNoteSaved?(trimmed)
            rerender()
        }
    }

    // MARK: - Subviews

    private func secondaryButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .medium))
                Text(label)
                    .font(Theme.dmSans(12, weight: .medium))
            }
            .foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    private var dot: some View {
        Text("·")
            .foregroundStyle(Theme.textMuted)
    }

    // MARK: - Actions

    private func rerender() {
        renderer.render(lyric: lyric, note: noteText, username: username, aiArtImage: artVM.aiArtImage)
    }

    private func shareActivityItems(image: UIImage) -> [Any] {
        var items: [Any] = [image]
        if let url = shareURL {
            items.append(url)
            items.append("a lyric that stayed with me\n\n— earwyrm\n\(url.absoluteString)")
        }
        return items
    }

    private func saveToPhotos() {
        Analytics.track(.shareActionChosen, ["action": "save_photo"])
        guard let image = renderer.renderedImage else { return }
        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        Haptics.success()
        withAnimation { savedPhoto = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation { savedPhoto = false }
        }
    }

    private func copyLink() {
        Analytics.track(.shareActionChosen, ["action": "copy_link"])
        guard let url = shareURL else { return }
        UIPasteboard.general.string = url.absoluteString
        Haptics.light()
        withAnimation { copiedLink = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation { copiedLink = false }
        }
    }
}
