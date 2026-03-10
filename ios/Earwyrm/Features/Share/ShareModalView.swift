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
    @State private var showSystemSheet = false
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
    @State private var showGenSheet = false
    @State private var inlineNote = ""
    /// Track the initial art style to detect changes on dismiss
    @State private var initialStyle: ArtGalleryViewModel.CardStyle?

    /// Derive renderer style from gallery selection
    private var rendererStyle: ShareStyle {
        switch artVM.selectedStyle {
        case .none: return .minimal
        case .coverArt: return .coverArt
        case .aiVariant: return .aiArt
        }
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
                ArtGalleryStrip(
                    viewModel: artVM,
                    onGenerate: { handleArtAction() },
                    isGenerating: artVM.isGeneratingArt,
                    isLocked: !subscriptionManager.isPlus && !artVM.hasAIArt && freeGenExhausted
                ) {
                    rerender()
                }

                // ── Controls ──
                HStack {
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

                // ── Share Destinations ──
                ShareDestinationRow(
                    destinations: ShareDestination.available,
                    onSelect: handleShareDestination
                )

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
            async let coverArt: () = renderer.loadCoverArt(for: lyric)
            async let variants: () = artVM.loadVariants(for: lyric)
            _ = await (coverArt, variants)
            initialStyle = artVM.selectedStyle
            rerender()
        }
        .onDisappear {
            // Persist active variant if user changed selection
            if let initial = initialStyle,
               artVM.selectedStyle != initial {
                Task {
                    await artVM.persistActiveVariant(lyricId: lyric.id)
                    onArtGenerated?()
                }
            }
        }
        .sheet(isPresented: $showSystemSheet) {
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
        .sheet(isPresented: $showGenSheet) {
            ArtGenerationSheet(
                isPlus: subscriptionManager.isPlus,
                hasExistingArt: artVM.hasAIArt,
                existingNote: noteText,
                artRemaining: artVM.artRemaining,
                onGenerate: { note, refinement in
                    // Save note if new or changed
                    if let note {
                        let noteChanged = note != (noteText ?? "")
                        if noteText == nil || noteChanged {
                            saveInlineNote(note)
                        }
                    }
                    performGenerate(refinement: refinement)
                },
                onShowPaywall: { showPaywall = true }
            )
            .presentationDetents([subscriptionManager.isPlus ? .medium : .height(noteText == nil ? 370 : 220)])
            .presentationDragIndicator(.visible)
            .presentationBackground(Theme.background)
        }
    }

    private func handleArtAction() {
        let action = artVM.resolveAction(isPlus: subscriptionManager.isPlus, freeGenExhausted: freeGenExhausted)
        switch action {
        case .showGenSheet:
            showGenSheet = true
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
            try? await supabase.from("lyric_notes").upsert(insert, onConflict: "lyric_id,user_id").execute()
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
        renderer.style = rendererStyle
        renderer.render(lyric: lyric, note: noteText, username: username, aiArtImage: artVM.aiArtImage)
    }

    private func shareActivityItems(image: UIImage) -> [Any] {
        // Use UIActivityItemSource for fine-grained control:
        // - Image shows inline everywhere (including Messages)
        // - Link is included for X, WhatsApp, etc. but excluded
        //   from Messages (which would hide the image)
        var items: [Any] = [
            ShareImageItemSource(image: image, url: shareURL)
        ]
        if let url = shareURL {
            items.append(ShareLinkItemSource(url: url))
        }
        return items
    }

    private func saveToPhotos() {
        Analytics.track(.shareActionChosen, ["action": "save_photo"])
        let previousFormat = renderer.format
        renderer.format = .story
        rerender()
        guard let image = renderer.renderedImage else { return }
        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        // Restore preview format
        renderer.format = previousFormat
        rerender()
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

    // MARK: - Share Destination Dispatch

    private func handleShareDestination(_ destination: ShareDestination) {
        Analytics.track(.shareActionChosen, [
            "action": destination.rawValue,
            "format": destination.format.rawValue
        ])
        Haptics.success()

        // Render in the destination's preferred format
        renderer.format = destination.format
        rerender()

        switch destination {
        case .igStories:
            shareToIGStories()
        case .whatsapp:
            shareToWhatsApp()
        case .threads:
            shareToThreads()
        case .copyLink:
            copyLink()
        case .x:
            shareToX()
        case .messages, .tiktok, .more:
            showSystemSheet = true
        }
    }

    private func shareToIGStories() {
        guard let image = renderer.renderedImage,
              let imageData = image.pngData(),
              let url = URL(string: "instagram-stories://share?source_application=com.earwyrm.app") else { return }

        let pasteboardItems: [[String: Any]] = [[
            "com.instagram.sharedSticker.backgroundImage": imageData
        ]]
        let options: [UIPasteboard.OptionsKey: Any] = [
            .expirationDate: Date().addingTimeInterval(5 * 60)
        ]
        UIPasteboard.general.setItems(pasteboardItems, options: options)
        UIApplication.shared.open(url)
    }

    private func shareToWhatsApp() {
        guard let image = renderer.renderedImage,
              let _ = image.jpegData(compressionQuality: 0.9) else { return }

        // Copy image to pasteboard so user can paste in WhatsApp
        UIPasteboard.general.image = image

        let shareText = shareURL?.absoluteString ?? ""
        let encoded = shareText.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "whatsapp://send?text=\(encoded)") {
            UIApplication.shared.open(url)
        }
    }

    private func shareToX() {
        guard let image = renderer.renderedImage else { return }

        // Copy image to pasteboard so user can paste in X
        UIPasteboard.general.image = image

        let shareText = shareURL?.absoluteString ?? ""
        let encoded = shareText.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "twitter://post?message=\(encoded)") {
            UIApplication.shared.open(url)
        }
    }

    private func shareToThreads() {
        guard let image = renderer.renderedImage else { return }

        // Copy image to pasteboard so user can paste in Threads
        UIPasteboard.general.image = image

        let shareText = shareURL?.absoluteString ?? ""
        let encoded = shareText.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "barcelona://create?text=\(encoded)") {
            UIApplication.shared.open(url)
        }
    }
}
