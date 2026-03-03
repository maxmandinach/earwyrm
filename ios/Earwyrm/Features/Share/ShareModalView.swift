import SwiftUI
import UIKit

struct ShareModalView: View {
    let lyric: Lyric
    let note: LyricNote?
    let username: String?
    var onShareCompleted: (() -> Void)?

    @State private var renderer = ShareImageRenderer()
    @State private var showActivitySheet = false
    @State private var copiedLink = false
    @State private var savedPhoto = false
    @State private var showPaywall = false
    @Environment(\.dismiss) private var dismiss
    @Environment(SubscriptionManager.self) private var subscriptionManager

    private var noteText: String? {
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

    /// The style options visible to the user depend on what's available
    private var availableStyles: [ShareStyle] {
        var styles: [ShareStyle] = [.minimal]
        if hasCoverArt { styles.append(.coverArt) }
        if renderer.hasAIArt { styles.append(.aiArt) }
        return styles
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Live image preview
                ZStack {
                    if let image = renderer.renderedImage {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxHeight: 420)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
                    } else {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Theme.card)
                            .frame(height: 420)
                            .overlay {
                                ProgressView()
                                    .tint(Theme.accent)
                            }
                    }

                    // AI art generation overlay
                    if renderer.isGeneratingArt {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Theme.card.opacity(0.85))
                            .frame(height: 420)
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

                Spacer()

                // Theme + Style pickers
                HStack {
                    segmentedPicker(
                        options: ShareTheme.allCases,
                        selected: renderer.theme,
                        label: { $0 == .light ? "Light" : "Dark" }
                    ) { theme in
                        renderer.theme = theme
                        rerender()
                    }

                    Spacer()

                    if availableStyles.count > 1 {
                        segmentedPicker(
                            options: availableStyles,
                            selected: renderer.style,
                            label: { $0.label }
                        ) { style in
                            renderer.style = style
                            rerender()
                        }
                    }
                }

                // Emphasis toggle — centered, only when note exists
                if noteText != nil {
                    Spacer()

                    segmentedPicker(
                        options: ShareEmphasis.allCases,
                        selected: renderer.emphasis,
                        label: { $0.label }
                    ) { emphasis in
                        renderer.emphasis = emphasis
                        rerender()
                    }
                }

                Spacer()

                // AI Art generate / regenerate button
                aiArtButton

                Spacer()

                // Primary action — Share
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

                Spacer()

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

                Spacer()
            }
            .padding(.horizontal, Theme.Spacing.lg)
            .padding(.top, Theme.Spacing.md)
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
        .sheet(isPresented: $showPaywall) {
            EarwyrmPlusPaywall()
                .presentationDragIndicator(.visible)
        }
    }

    // MARK: - AI Art Button

    private func artButtonLabel(_ prefix: String) -> String {
        if let remaining = renderer.artRemaining {
            return remaining > 0 ? "\(prefix) (\(remaining) remaining)" : "Daily limit reached"
        }
        return prefix
    }

    @ViewBuilder
    private var aiArtButton: some View {
        if renderer.hasAIArt {
            // Regenerate button
            Button {
                Analytics.track(.aiArtRegenerated)
                Task {
                    await renderer.generateAIArt(lyric: lyric, note: noteText, username: username)
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12, weight: .medium))
                    Text(artButtonLabel("Regenerate artwork"))
                        .font(Theme.dmSans(13, weight: .medium))
                }
                .foregroundStyle(Theme.accent)
            }
            .disabled(renderer.isGeneratingArt || renderer.artRemaining == 0)
            .opacity(renderer.isGeneratingArt ? 0.5 : 1)
        } else {
            // Generate button — visible to all users
            Button {
                if subscriptionManager.isPlus {
                    Task {
                        await renderer.generateAIArt(lyric: lyric, note: noteText, username: username)
                    }
                } else {
                    Analytics.track(.aiArtPaywallHit)
                    showPaywall = true
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "wand.and.stars")
                        .font(.system(size: 13, weight: .medium))
                    Text(artButtonLabel("Generate artwork"))
                        .font(Theme.dmSans(13, weight: .medium))
                    if !subscriptionManager.isPlus {
                        Text("plus")
                            .font(Theme.dmSans(10, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Theme.accent)
                            .clipShape(Capsule())
                    }
                }
                .foregroundStyle(Theme.accent)
            }
            .disabled(renderer.isGeneratingArt)
            .opacity(renderer.isGeneratingArt ? 0.5 : 1)
        }

        if let error = renderer.aiArtError {
            Text(error)
                .font(Theme.dmSans(11))
                .foregroundStyle(.red.opacity(0.7))
                .lineLimit(2)
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
