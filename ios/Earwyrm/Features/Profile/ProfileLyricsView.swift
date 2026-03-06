import SwiftUI

struct ProfileLyricsView: View {
    let lyrics: [Lyric]

    var body: some View {
        if lyrics.isEmpty {
            emptyState
        } else {
            LazyVStack(spacing: Theme.Spacing.sm) {
                ForEach(lyrics) { lyric in
                    NavigationLink(value: LyricWithProfile(lyric: lyric, username: nil)) {
                        ProfileLyricRow(lyric: lyric)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, Theme.Spacing.md)
            .padding(.top, Theme.Spacing.sm)
        }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Spacer().frame(height: 60)
            Text("no lyrics yet")
                .font(Theme.caveat(28))
                .foregroundStyle(Theme.textPrimary)
            Text("Post your first earwyrm from the Home tab.")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }
}

// MARK: - Row

private struct ProfileLyricRow: View {
    let lyric: Lyric

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
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

            // Meta row
            HStack(spacing: Theme.Spacing.md) {
                // Visibility
                HStack(spacing: 3) {
                    Image(systemName: lyric.isPublic == true ? "globe" : "lock")
                        .font(.system(size: 10))
                    Text(lyric.isPublic == true ? "public" : "private")
                        .font(Theme.dmSans(11))
                }
                .foregroundStyle(Theme.textMuted)

                HStack(spacing: 4) {
                    ResonateIcon(isActive: false, isAnimating: false, size: 14)
                    Text("\(lyric.reactionCount ?? 0)")
                        .font(Theme.dmSans(12))
                }
                .foregroundStyle(Theme.textMuted)

                Spacer()

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
