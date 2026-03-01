import SwiftUI

struct FullLyricsView: View {
    let songTitle: String
    let artistName: String?
    let savedLyrics: [Lyric]

    @State private var fullLyrics: String?
    @State private var isLoading = true
    @State private var failed = false

    private var highlightedLines: Set<Int> {
        guard let lyrics = fullLyrics else { return [] }
        let lines = lyrics.components(separatedBy: "\n")
        let savedNormalized = savedLyrics.map { normalize($0.content) }
        var highlighted = Set<Int>()

        for (index, line) in lines.enumerated() {
            let normalizedLine = normalize(line)
            guard normalizedLine.count >= 3 else { continue }
            for saved in savedNormalized {
                if saved.contains(normalizedLine) || normalizedLine.contains(saved) {
                    highlighted.insert(index)
                    break
                }
            }
        }
        return highlighted
    }

    var body: some View {
        Group {
            if isLoading {
                loadingState
            } else if let lyrics = fullLyrics {
                lyricsContent(lyrics)
            } else {
                emptyState
            }
        }
        .task {
            await loadLyrics()
        }
    }

    private func lyricsContent(_ lyrics: String) -> some View {
        let lines = lyrics.components(separatedBy: "\n")
        return VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                let isHighlighted = highlightedLines.contains(index)
                let isEmpty = line.trimmingCharacters(in: .whitespaces).isEmpty

                if isEmpty {
                    Spacer().frame(height: 16)
                } else {
                    Text(line)
                        .font(Theme.caveat(18))
                        .foregroundStyle(isHighlighted ? Theme.textPrimary : Theme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 4)
                        .padding(.horizontal, 8)
                        .background(
                            isHighlighted
                                ? Theme.accent.opacity(0.12)
                                : Color.clear
                        )
                        .overlay(alignment: .leading) {
                            if isHighlighted {
                                Rectangle()
                                    .fill(Theme.accent)
                                    .frame(width: 2)
                            }
                        }
                }
            }

            // Attribution footer
            HStack(spacing: 4) {
                Text("lyrics from")
                    .font(Theme.dmSans(11))
                    .foregroundStyle(Theme.textMuted)
                Text("lrclib")
                    .font(Theme.dmSans(11))
                    .foregroundStyle(Theme.accent)
            }
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.top, Theme.Spacing.lg)
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    private var loadingState: some View {
        VStack(spacing: Theme.Spacing.md) {
            ForEach(0..<8, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 4)
                    .fill(Theme.dividerColor)
                    .frame(height: 16)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
        .redacted(reason: .placeholder)
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Image(systemName: "text.page.slash")
                .font(.system(size: 28))
                .foregroundStyle(Theme.textMuted)

            Text("lyrics not available")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.textSecondary)

            Text("we couldn't find full lyrics for this song")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.Spacing.xxl)
    }

    private func loadLyrics() async {
        guard let artist = artistName, !artist.isEmpty else {
            isLoading = false
            return
        }

        let lyrics = await SongLyricsService.fetchLyrics(songTitle: songTitle, artistName: artist)
        fullLyrics = lyrics
        isLoading = false
    }

    private func normalize(_ text: String) -> String {
        text.lowercased()
            .replacingOccurrences(
                of: "[^a-z0-9\\s]",
                with: "",
                options: .regularExpression
            )
            .replacingOccurrences(
                of: "\\s+",
                with: " ",
                options: .regularExpression
            )
            .trimmingCharacters(in: .whitespaces)
    }
}
