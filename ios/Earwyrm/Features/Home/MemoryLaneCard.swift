import SwiftUI

struct MemoryLaneCard: View {
    let lyric: Lyric

    private var duration: String {
        let end = lyric.replacedAt ?? Date()
        return HomeViewModel.formatDuration(from: lyric.createdAt, to: end)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Lyric content (2-line clamp)
            Text("\u{201C}\(lyric.content)\u{201D}")
                .font(Theme.caveat(20))
                .foregroundStyle(Theme.Light.text)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)

            Spacer(minLength: 0)

            // Song / Artist
            if (lyric.songTitle ?? lyric.artistName) != nil {
                let display = [lyric.songTitle, lyric.artistName]
                    .compactMap { $0 }
                    .joined(separator: " — ")
                Text(display)
                    .font(Theme.dmSansItalic(12))
                    .foregroundStyle(Theme.Light.secondary)
                    .lineLimit(1)
            }

            // Duration badge
            Text(duration)
                .font(Theme.dmSans(11, weight: .medium))
                .foregroundStyle(Theme.Light.accent)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Theme.Light.accent.opacity(0.12))
                .clipShape(Capsule())
        }
        .padding(Theme.Spacing.md)
        .frame(width: 240, height: 150)
        .background(
            ZStack {
                Theme.Light.card
                if let url = lyric.coverArtUrl, let imageUrl = URL(string: url) {
                    AsyncImage(url: imageUrl) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .opacity(0.08)
                    } placeholder: {
                        EmptyView()
                    }
                }
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
        .onTapGesture {
            Haptics.light()
        }
    }
}
