import SwiftUI

struct ProfileLyricRow: View {
    let lyric: Lyric

    // Action state
    let hasReacted: Bool
    let reactionCount: Int
    let isResonateAnimating: Bool
    let onResonate: () -> Void
    let commentCount: Int
    let showComments: Bool
    let onToggleComments: () -> Void
    let isPublic: Bool
    let onVisibilityChange: (Bool) -> Void
    let onSave: () -> Void
    let isSaved: Bool
    let onShare: () -> Void
    let isOwn: Bool
    let currentUserId: UUID?

    // Navigation
    var onNavigate: (() -> Void)?

    // Long-press context menu actions
    var onEdit: (() -> Void)?
    var onMakeCurrent: (() -> Void)?
    var onDelete: (() -> Void)?

    var body: some View {
        VStack(spacing: 0) {
            // Tappable content area → navigates to detail
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                HStack {
                    // Current badge
                    if lyric.isCurrent == true {
                        Text("CURRENT")
                            .font(Theme.dmSans(10, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Theme.accent)
                            .clipShape(Capsule())
                    }

                    Spacer()

                    Text(relativeDate(lyric.createdAt))
                        .font(Theme.dmSans(11))
                        .foregroundStyle(Theme.textMuted)
                        .opacity(0.7)
                }

                // Content
                Text(lyric.content)
                    .font(Theme.caveat(24, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                    .lineSpacing(6)
                    .lineLimit(3)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Song — Artist
                if lyric.songTitle != nil || lyric.artistName != nil {
                    HStack(spacing: 4) {
                        if let song = lyric.songTitle {
                            Text(song)
                                .font(Theme.dmSansItalic(13))
                                .foregroundStyle(Theme.accent)
                        }
                        if lyric.songTitle != nil && lyric.artistName != nil {
                            Text("—")
                                .font(Theme.dmSans(13))
                                .foregroundStyle(Theme.textMuted)
                        }
                        if let artist = lyric.artistName {
                            Text(artist)
                                .font(Theme.dmSansItalic(13))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { onNavigate?() }
            .contextMenu {
                if isOwn {
                    if let onEdit {
                        Button { onEdit() } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                    }
                    if let onMakeCurrent, lyric.isCurrent != true {
                        Button { onMakeCurrent() } label: {
                            Label("Make Current", systemImage: "arrow.uturn.up")
                        }
                    }
                    if let onDelete {
                        Button(role: .destructive) { onDelete() } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
            .padding(.horizontal, Theme.Spacing.md)
            .padding(.top, Theme.Spacing.md)
            .padding(.bottom, Theme.Spacing.xs)

            // Action bar — outside NavigationLink to avoid button-in-button
            CardActionBar(
                lyric: lyric,
                isPublic: isPublic,
                isOwn: isOwn,
                onShare: onShare,
                onEdit: onEdit ?? {},
                onVisibilityChange: onVisibilityChange,
                onToggleComments: onToggleComments,
                onSave: onSave,
                isSaved: isSaved,
                hasReacted: hasReacted,
                reactionCount: reactionCount,
                isResonateAnimating: isResonateAnimating,
                onResonate: onResonate,
                commentCount: commentCount
            )
            .padding(.horizontal, Theme.Spacing.md)
            .padding(.bottom, Theme.Spacing.sm)

            // Comment section — shown when toggled
            if showComments {
                CommentSectionView(
                    lyricId: lyric.id,
                    currentUserId: currentUserId,
                    initialCount: commentCount
                )
                .padding(.horizontal, Theme.Spacing.md)
                .padding(.bottom, Theme.Spacing.md)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(
            ZStack {
                Theme.card
                if let artUrl = lyric.cardArtUrl {
                    CardArtBackground(
                        url: artUrl,
                        opacity: 0.2,
                        gradientStart: 0.2,
                        gradientEnd: 0.85
                    )
                }
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }

    private func relativeDate(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "just now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        if interval < 86400 { return "\(Int(interval / 3600))h ago" }
        if interval < 604800 { return "\(Int(interval / 86400))d ago" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}
