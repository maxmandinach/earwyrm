import SwiftUI

struct ProfileResonatedView: View {
    let resonatedLyrics: [ResonatedLyric]

    var body: some View {
        if resonatedLyrics.isEmpty {
            emptyState
        } else {
            LazyVStack(spacing: Theme.Spacing.sm) {
                ForEach(resonatedLyrics) { item in
                    NavigationLink(value: LyricWithProfile(lyric: item.lyric, username: item.username)) {
                        ResonatedRow(item: item)
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
            Text("nothing resonated yet")
                .font(Theme.caveat(28))
                .foregroundStyle(Theme.Light.text)
            Text("Tap the waveform on lyrics that resonate with you.")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.Light.muted)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }
}

// MARK: - Row

private struct ResonatedRow: View {
    let item: ResonatedLyric

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Content
            Text(item.lyric.content)
                .font(Theme.caveat(24, weight: .medium))
                .foregroundStyle(Theme.Light.text)
                .lineSpacing(6)
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Song — Artist
            if item.lyric.songTitle != nil || item.lyric.artistName != nil {
                HStack(spacing: 4) {
                    if let song = item.lyric.songTitle {
                        Text(song)
                            .font(Theme.dmSansItalic(13))
                            .foregroundStyle(Theme.Light.accent)
                    }
                    if item.lyric.songTitle != nil && item.lyric.artistName != nil {
                        Text("—")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.Light.muted)
                    }
                    if let artist = item.lyric.artistName {
                        Text(artist)
                            .font(Theme.dmSansItalic(13))
                            .foregroundStyle(Theme.Light.accent)
                    }
                }
            }

            // Meta row
            HStack(spacing: Theme.Spacing.md) {
                if let username = item.username {
                    Text("by @\(username)")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.Light.secondary)
                }

                Spacer()

                Text("resonated \(relativeDate(item.resonatedAt))")
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
