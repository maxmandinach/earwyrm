import SwiftUI

struct CompactLyricCard: View {
    let lyric: Lyric
    var username: String?
    var onShare: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Lyric content — 3-line clamp, smaller Caveat
            Text(lyric.content)
                .font(Theme.caveat(24, weight: .medium))
                .foregroundStyle(Theme.Light.text)
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
                                .foregroundStyle(Theme.Light.accent)
                        }
                    }

                    if lyric.songTitle != nil && lyric.artistName != nil {
                        Text("—")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.Light.muted)
                    }

                    if let artist = lyric.artistName {
                        NavigationLink(value: ArtistDestination(name: artist)) {
                            Text(artist)
                                .font(Theme.dmSansItalic(13))
                                .foregroundStyle(Theme.Light.accent)
                        }
                    }
                }
            }

            // Inline counts row: waveform + comments + share + username + timestamp
            HStack(spacing: Theme.Spacing.md) {
                HStack(spacing: 4) {
                    ResonateIcon(isActive: false, isAnimating: false, size: 14)
                    Text("\(lyric.reactionCount ?? 0)")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.Light.muted)
                }

                HStack(spacing: 4) {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.Light.muted)
                    Text("\(lyric.commentCount ?? 0)")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.Light.muted)
                }

                if let username {
                    NavigationLink(value: ProfileDestination(userId: lyric.userId, username: username)) {
                        Text("@\(username)")
                            .font(Theme.dmSans(11))
                            .foregroundStyle(Theme.Light.accent)
                    }
                }

                Spacer()

                if let onShare {
                    Button(action: onShare) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.Light.muted)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                }

                Text(relativeDate(lyric.createdAt))
                    .font(Theme.dmSans(11))
                    .foregroundStyle(Theme.Light.muted)
                    .opacity(0.7)
            }
        }
        .padding(Theme.Spacing.md)
        .background(Theme.Light.card)
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
