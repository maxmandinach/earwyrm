import SwiftUI

struct SocialLyricCard: View {
    let item: LyricWithProfile

    private var lyric: Lyric { item.lyric }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Lyric content (3-line clamp)
            Text("\u{201C}\(lyric.content)\u{201D}")
                .font(Theme.caveat(20))
                .foregroundStyle(Theme.Light.text)
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
                    .foregroundStyle(Theme.Light.secondary)
                    .lineLimit(1)
            }

            // Username + resonation count
            HStack {
                if let username = item.username {
                    Text("@\(username)")
                        .font(Theme.dmSans(11))
                        .foregroundStyle(Theme.Light.muted)
                }

                Spacer()

                if let count = lyric.reactionCount, count > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "waveform.path")
                            .font(.system(size: 10))
                        Text("\(count)")
                            .font(Theme.dmSans(11, weight: .medium))
                    }
                    .foregroundStyle(Theme.Light.accent)
                }
            }
        }
        .padding(Theme.Spacing.md)
        .frame(width: 260, height: 170)
        .background(Theme.Light.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
    }
}
