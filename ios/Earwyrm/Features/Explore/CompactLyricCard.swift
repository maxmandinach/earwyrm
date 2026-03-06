import SwiftUI

struct CompactLyricCard: View {
    let lyric: Lyric
    var username: String?
    var isPlus: Bool = false
    var onShare: (() -> Void)?
    var onSave: (() -> Void)?
    var onReport: (() -> Void)?
    var onBlock: (() -> Void)?
    var isSaved: Bool = false

    // Resonate state
    var hasReacted: Bool = false
    var reactionCount: Int?
    var isResonateAnimating: Bool = false
    var onResonate: (() -> Void)?

    // Comment
    var onComment: (() -> Void)?

    private var displayReactionCount: Int {
        reactionCount ?? lyric.reactionCount ?? 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Lyric content — 3-line clamp, smaller Caveat
            Text(lyric.content)
                .font(Theme.caveat(24, weight: .medium))
                .foregroundStyle(Theme.textPrimary)
                .lineSpacing(6)
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Song — Artist (tappable navigation links)
            if lyric.songTitle != nil || lyric.artistName != nil {
                HStack(spacing: 4) {
                    if let song = lyric.songTitle {
                        NavigationLink(value: SongDestination(
                            title: song,
                            artistName: lyric.artistName,
                            coverArtUrl: lyric.coverArtUrl
                        )) {
                            Text(song)
                                .font(Theme.dmSansItalic(13))
                                .foregroundStyle(Theme.accent)
                        }
                    }

                    if lyric.songTitle != nil && lyric.artistName != nil {
                        Text("—")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.textMuted)
                    }

                    if let artist = lyric.artistName {
                        NavigationLink(value: ArtistDestination(name: artist)) {
                            Text(artist)
                                .font(Theme.dmSansItalic(13))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                }
            }

            // Inline counts row
            HStack(spacing: Theme.Spacing.md) {
                // Resonate button
                if let onResonate {
                    Button(action: onResonate) {
                        HStack(spacing: 4) {
                            ResonateIcon(isActive: hasReacted, isAnimating: isResonateAnimating, size: 14)
                            Text("\(displayReactionCount)")
                                .font(Theme.dmSans(12))
                                .foregroundStyle(hasReacted ? Theme.accent : Theme.textMuted)
                        }
                    }
                    .buttonStyle(.plain)
                } else {
                    HStack(spacing: 4) {
                        ResonateIcon(isActive: false, isAnimating: false, size: 14)
                        Text("\(displayReactionCount)")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.textMuted)
                    }
                    .opacity(0.5)
                }

                // Comment button
                if let onComment {
                    Button(action: onComment) {
                        HStack(spacing: 4) {
                            Image(systemName: "bubble.left")
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.textMuted)
                            Text("\(lyric.commentCount ?? 0)")
                                .font(Theme.dmSans(12))
                                .foregroundStyle(Theme.textMuted)
                        }
                    }
                    .buttonStyle(.plain)
                } else {
                    HStack(spacing: 4) {
                        Image(systemName: "bubble.left")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.textMuted)
                        Text("\(lyric.commentCount ?? 0)")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.textMuted)
                    }
                    .opacity(0.5)
                }

                if let username {
                    NavigationLink(value: ProfileDestination(userId: lyric.userId, username: username)) {
                        HStack(spacing: 2) {
                            Text("@\(username)")
                                .font(Theme.dmSans(11))
                                .foregroundStyle(Theme.accent)
                            if isPlus {
                                PlusBadge()
                            }
                        }
                    }
                }

                Spacer()

                if let onSave {
                    Button(action: onSave) {
                        Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(isSaved ? Theme.accent : Theme.textMuted)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                }

                if let onShare {
                    Button(action: onShare) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textMuted)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                }

                Text(relativeDate(lyric.createdAt))
                    .font(Theme.dmSans(11))
                    .foregroundStyle(Theme.textMuted)
                    .opacity(0.7)
            }
        }
        .padding(Theme.Spacing.md)
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
        .contextMenu {
            if let onResonate {
                Button { onResonate() } label: {
                    Label(hasReacted ? "Remove Resonation" : "Resonate", systemImage: hasReacted ? "waveform.circle.fill" : "waveform.circle")
                }
            }
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

            if let onReport {
                Divider()
                Button(role: .destructive) { onReport() } label: {
                    Label("Report", systemImage: "flag")
                }
            }
            if let username, let onBlock {
                Button(role: .destructive) { onBlock() } label: {
                    Label("Block @\(username)", systemImage: "hand.raised")
                }
            }
        }
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
