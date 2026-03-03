import SwiftUI

struct SocialLyricCard: View {
    let item: LyricWithProfile
    var onShare: (() -> Void)?
    var onSave: (() -> Void)?
    var onResonate: (() -> Void)?
    var onViewProfile: (() -> Void)?
    var onReport: (() -> Void)?
    var onBlock: (() -> Void)?
    var isSaved: Bool = false
    var hasReacted: Bool = false
    var reactionCount: Int = 0

    private var lyric: Lyric { item.lyric }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Lyric content (3-line clamp)
            Text("\u{201C}\(lyric.content)\u{201D}")
                .font(Theme.caveat(20))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .leading)

            Spacer(minLength: 0)

            // Song / Artist
            if lyric.songTitle != nil || lyric.artistName != nil {
                let display = [lyric.songTitle, lyric.artistName]
                    .compactMap { $0 }
                    .joined(separator: " — ")
                Text(display)
                    .font(Theme.dmSansItalic(12))
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(1)
            }

            // Username + actions
            HStack(spacing: 0) {
                if let username = item.username {
                    HStack(spacing: 2) {
                        Text("@\(username)")
                            .font(Theme.dmSans(11))
                            .foregroundStyle(Theme.textMuted)
                        if item.isPlus {
                            PlusBadge()
                        }
                    }
                }

                Spacer()

                // Resonate
                if let onResonate {
                    Button {
                        onResonate()
                    } label: {
                        HStack(spacing: 3) {
                            Image(systemName: "waveform.path")
                                .font(.system(size: 11))
                            if reactionCount > 0 {
                                Text("\(reactionCount)")
                                    .font(Theme.dmSans(11, weight: .medium))
                            }
                        }
                        .foregroundStyle(hasReacted ? Theme.accent : Theme.textMuted)
                        .frame(minWidth: 36, minHeight: 36)
                    }
                }

                // Save
                if let onSave {
                    Button {
                        onSave()
                    } label: {
                        Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(isSaved ? Theme.accent : Theme.textMuted)
                            .frame(minWidth: 36, minHeight: 36)
                    }
                }

                // Share
                if let onShare {
                    Button {
                        onShare()
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textMuted)
                            .frame(minWidth: 36, minHeight: 36)
                    }
                }
            }
        }
        .padding(Theme.Spacing.md)
        .frame(width: 260, height: 170)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
        .contextMenu {
            if let onShare {
                Button { onShare() } label: {
                    Label("Share", systemImage: "square.and.arrow.up")
                }
            }
            if let onSave {
                Button { onSave() } label: {
                    Label(isSaved ? "Remove from Collection" : "Save to Collection", systemImage: isSaved ? "bookmark.fill" : "bookmark")
                }
            }
            if let username = item.username, let onViewProfile {
                Button { onViewProfile() } label: {
                    Label("View @\(username)", systemImage: "person")
                }
            }

            if let onReport {
                Divider()
                Button(role: .destructive) { onReport() } label: {
                    Label("Report", systemImage: "flag")
                }
            }
            if let username = item.username, let onBlock {
                Button(role: .destructive) { onBlock() } label: {
                    Label("Block @\(username)", systemImage: "hand.raised")
                }
            }
        }
    }
}
