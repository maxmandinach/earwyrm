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

    /// Whether the free user has exhausted their free generation (server returned 403)
    @State private var freeGenExhausted = false
    @State private var showFreeGenConfirm = false
    @State private var showRegenConfirm = false
    @State private var inlineNote = ""
    @State private var regenNote = ""
    @State private var regenArtDirection = ""
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
        !subscriptionManager.isPlus && !renderer.hasAIArt && freeGenExhausted
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
                    if renderer.isGeneratingArt {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Theme.card.opacity(0.85))
                            .overlay {
                                VStack(spacing: 12) {
                                    ProgressView()
                                        .tint(Theme.accent)
                                    Text("generating artwork...")
                                        .font(Theme.dmSans(14))
                                        .foregroundStyle(Theme.textSecondary)
                                }
                            }
                    }
                }
                .frame(maxHeight: 400)

                // AI Art error
                if let error = renderer.aiArtError {
                    Text(error)
                        .font(Theme.dmSans(11))
                        .foregroundStyle(.red.opacity(0.7))
                        .lineLimit(2)
                }

                // ── Art Gallery (when multiple variants exist) ──
                if renderer.style == .aiArt && renderer.variants.count > 1 {
                    variantStrip
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
            await renderer.initialRender(lyric: lyric, note: noteText, username: username)
            initialVariantIndex = renderer.activeVariantIndex
        }
        .onDisappear {
            // Persist active variant if user changed selection
            if let initial = initialVariantIndex,
               renderer.activeVariantIndex != initial,
               let activeUrl = renderer.activeVariantUrl {
                Task {
                    await CardArtService.setActiveVariant(lyricId: lyric.id, imageUrl: activeUrl)
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
        .onChange(of: renderer.needsUpgrade) { _, needsUpgrade in
            if needsUpgrade {
                freeGenExhausted = true
                Analytics.track(.aiArtPaywallHit)
                showPaywall = true
                renderer.needsUpgrade = false
            }
        }
        .sheet(isPresented: $showPaywall) {
            EarwyrmPlusPaywall(context: "ai_art")
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showFreeGenConfirm) {
            freeGenConfirmSheet
                .presentationDetents([.height(noteText == nil ? 370 : 220)])
                .presentationDragIndicator(.visible)
                .presentationBackground(Theme.background)
        }
        .sheet(isPresented: $showRegenConfirm) {
            regenConfirmSheet
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
                .presentationBackground(Theme.background)
        }
    }

    // MARK: - Style Picker (with AI Art always visible)

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
            if renderer.style == .aiArt && renderer.hasAIArt && !renderer.isGeneratingArt {
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
                // Free user, no art, gen exhausted → paywall
                Analytics.track(.aiArtPaywallHit)
                showPaywall = true
                return
            }
            renderer.style = .aiArt
            rerender()
            // Auto-trigger generate flow when switching to AI Art with no art
            if !renderer.hasAIArt && !renderer.isGeneratingArt {
                handleArtAction()
            }
        } else {
            renderer.style = style
            rerender()
        }
    }

    private func handleArtAction() {
        // Free user who already used their gen (or has existing art) → paywall
        if !subscriptionManager.isPlus && (freeGenExhausted || renderer.wasFreeTierGen || renderer.hasAIArt) {
            Analytics.track(.aiArtPaywallHit)
            showPaywall = true
            return
        }
        if renderer.hasAIArt {
            // Plus user with existing art → regen sheet with note + art direction
            regenNote = noteText ?? ""
            regenArtDirection = ""
            showRegenConfirm = true
        } else if !subscriptionManager.isPlus {
            // Free user, no art yet → free gen confirm
            showFreeGenConfirm = true
        } else {
            // Plus user, no art yet → generate directly
            performGenerate()
        }
    }

    private func performGenerate(refinement: String? = nil) {
        if renderer.hasAIArt {
            Analytics.track(.aiArtRegenerated)
        }
        Task {
            // Save inline note to DB if provided and no existing note
            if let userId = auth.userId, noteText == nil {
                let trimmed = inlineNote.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty {
                    let insert = NoteInsert(lyricId: lyric.id, userId: userId, content: trimmed, isPublic: false)
                    try? await supabase.from("lyric_notes").insert(insert).execute()
                    savedNoteContent = trimmed
                    onNoteSaved?(trimmed)
                    rerender()
                }
            }

            await renderer.generateAIArt(lyric: lyric, note: artNote, username: username, refinement: refinement)
            if renderer.wasFreeTierGen {
                freeGenExhausted = true
            }
            if renderer.hasAIArt {
                onArtGenerated?()
            }
        }
    }

    // MARK: - Free Gen Confirmation Sheet

    /// The effective note for art generation — either the existing note or the inline one
    private var artNote: String? {
        if let noteText { return noteText }
        let trimmed = inlineNote.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private var freeGenConfirmSheet: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Title
            Text("Create Your Artwork")
                .font(Theme.dmSans(20, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity)

            // Note field or confirmation
            if noteText == nil {
                VStack(alignment: .leading, spacing: 5) {
                    Text("add a personal note (optional)")
                        .font(Theme.dmSans(14, weight: .medium))
                        .foregroundStyle(Theme.textPrimary)

                    Text("saves to lyric card · private by default · shapes your artwork")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                }

                TextField("what does this lyric mean to you?", text: $inlineNote, axis: .vertical)
                    .font(Theme.noteFont(15))
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(2...4)
                    .padding(12)
                    .background(Theme.background)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Theme.dividerColor, lineWidth: 1)
                    )
            } else {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.accent)
                    Text("Your note will shape the artwork")
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.textSecondary)
                }
            }

            // Generate
            Button {
                showFreeGenConfirm = false
                performGenerate()
            } label: {
                HStack(spacing: 8) {
                    Text("✦")
                        .font(.system(size: 12))
                    Text("Generate")
                        .font(Theme.dmSans(16, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Free gen hint + upsell
            HStack(spacing: 0) {
                Spacer()
                Text("Your one free generation. ")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.textMuted)
                Button {
                    showFreeGenConfirm = false
                    showPaywall = true
                } label: {
                    Text("Get more with earwyrm+")
                        .font(Theme.dmSans(12, weight: .medium))
                        .foregroundStyle(Theme.accent)
                        .underline()
                }
                Spacer()
            }
        }
        .padding(.horizontal, Theme.Spacing.lg)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .background(Theme.background)
    }

    // MARK: - Regenerate Sheet (Note + Art Direction)

    private var regenConfirmSheet: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Generate New Artwork")
                .font(Theme.dmSans(20, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity)

            // Editable note
            VStack(alignment: .leading, spacing: 5) {
                Text("your note")
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
            }

            TextField("add a personal note (optional)", text: $regenNote, axis: .vertical)
                .font(Theme.noteFont(15))
                .foregroundStyle(Theme.textSecondary)
                .lineLimit(2...4)
                .padding(12)
                .background(Theme.background)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Theme.dividerColor, lineWidth: 1)
                )

            // Art direction
            VStack(alignment: .leading, spacing: 5) {
                Text("art direction (optional)")
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
            }

            TextField("warmer colors, more abstract, add rain...", text: $regenArtDirection, axis: .vertical)
                .font(Theme.noteFont(15))
                .foregroundStyle(Theme.textSecondary)
                .lineLimit(1...3)
                .padding(12)
                .background(Theme.background)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Theme.dividerColor, lineWidth: 1)
                )

            // Generate button
            Button {
                showRegenConfirm = false
                performRegenerate()
            } label: {
                HStack(spacing: 8) {
                    Text("✦").font(.system(size: 12))
                    Text("Generate").font(Theme.dmSans(16, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Remaining count
            if let remaining = renderer.artRemaining, remaining > 0 {
                Text("\(remaining) generations remaining this month")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.textMuted)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, Theme.Spacing.lg)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .background(Theme.background)
    }

    private func performRegenerate() {
        // Save note changes if edited
        let trimmedNote = regenNote.trimmingCharacters(in: .whitespacesAndNewlines)
        let noteChanged = trimmedNote != (noteText ?? "")

        if noteChanged, let userId = auth.userId {
            Task {
                if trimmedNote.isEmpty {
                    // Note was cleared — don't save empty
                } else {
                    let insert = NoteInsert(lyricId: lyric.id, userId: userId, content: trimmedNote, isPublic: false)
                    try? await supabase.from("lyric_notes").upsert(insert).execute()
                    savedNoteContent = trimmedNote
                    onNoteSaved?(trimmedNote)
                    rerender()
                }
            }
        }

        let trimmedDirection = regenArtDirection.trimmingCharacters(in: .whitespacesAndNewlines)
        let refinement = trimmedDirection.isEmpty ? nil : trimmedDirection
        performGenerate(refinement: refinement)
    }

    // MARK: - Variant Gallery Strip

    private var variantStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(renderer.variants.enumerated()), id: \.offset) { index, entry in
                    Button {
                        renderer.activeVariantIndex = index
                        rerender()
                    } label: {
                        Image(uiImage: entry.image)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 52, height: 52)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .strokeBorder(
                                        index == renderer.activeVariantIndex ? Theme.accent : Color.clear,
                                        lineWidth: 2
                                    )
                            )
                            .overlay(alignment: .bottomTrailing) {
                                if index == renderer.activeVariantIndex {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 14))
                                        .foregroundStyle(Theme.accent)
                                        .background(Circle().fill(Color.white).padding(1))
                                        .offset(x: 4, y: 4)
                                }
                            }
                    }
                }
            }
            .padding(.horizontal, 2)
        }
    }

    // MARK: - Subviews

    private func segmentedPicker<T: Hashable>(
        options: [T],
        selected: T,
        label: @escaping (T) -> String,
        onSelect: @escaping (T) -> Void
    ) -> some View {
        HStack(spacing: 0) {
            ForEach(options, id: \.self) { option in
                Button {
                    onSelect(option)
                } label: {
                    Text(label(option))
                        .font(Theme.dmSans(13, weight: selected == option ? .semibold : .regular))
                        .foregroundStyle(selected == option ? Theme.textPrimary : Theme.textMuted)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(
                            selected == option
                                ? Theme.card
                                : Color.clear
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
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
        renderer.render(lyric: lyric, note: noteText, username: username)
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
