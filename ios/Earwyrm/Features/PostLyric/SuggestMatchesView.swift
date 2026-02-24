import SwiftUI

/// Shows existing public lyrics matching the user's content or song title.
/// Selecting a match locks the content field and fills artist/song.
struct SuggestMatchesView: View {
    let matches: [SuggestMatch]
    let selectedId: UUID?
    let onSelect: (SuggestMatch?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("someone already saved this one — tap to use it:")
                .font(Theme.dmSans(12))
                .foregroundStyle(Theme.textMuted)

            ForEach(matches) { match in
                Button {
                    if selectedId == match.id {
                        onSelect(nil)
                    } else {
                        onSelect(match)
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(match.content.count > 80
                             ? String(match.content.prefix(80)) + "..."
                             : match.content)
                            .font(Theme.caveat(16))
                            .foregroundStyle(Theme.textSecondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)

                        if let songTitle = match.songTitle {
                            Text(songTitle + (match.artistName.map { " — \($0)" } ?? ""))
                                .font(Theme.dmSans(12))
                                .foregroundStyle(Theme.textMuted)
                        }

                        if selectedId == match.id {
                            Text("Lyric + details will be filled in for you")
                                .font(Theme.dmSans(12, weight: .medium))
                                .foregroundStyle(Theme.textSecondary)
                                .padding(.top, 2)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(selectedId == match.id
                                ? Theme.accent.opacity(0.1)
                                : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(selectedId == match.id
                                    ? Theme.accent.opacity(0.3)
                                    : Theme.dividerColor,
                                    lineWidth: 1)
                    )
                }
            }
        }
        .padding(12)
        .background(Theme.background.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Theme.dividerColor, lineWidth: 1)
        )
    }
}

// MARK: - Match Model

struct SuggestMatch: Identifiable, Decodable {
    let id: UUID
    let content: String
    let artistName: String?
    let songTitle: String?

    enum CodingKeys: String, CodingKey {
        case id, content
        case artistName = "artist_name"
        case songTitle = "song_title"
    }
}
