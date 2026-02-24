import SwiftUI

struct GeniusSuggestionBanner: View {
    let suggestions: [GeniusSuggestion]
    let isLoading: Bool
    let onSelect: (GeniusSuggestion) -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Text("is this the song?")
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.textMuted)

                Spacer()

                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                        .padding(4)
                }
            }

            if isLoading {
                HStack {
                    ProgressView()
                        .scaleEffect(0.7)
                        .tint(Theme.textMuted)
                    Text("identifying song...")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textMuted)
                }
                .padding(.vertical, Theme.Spacing.sm)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(suggestions) { suggestion in
                            suggestionCard(suggestion)
                        }
                    }
                }
            }
        }
        .padding(12)
        .background(Theme.accent.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Theme.accent.opacity(0.2), lineWidth: 1)
        )
    }

    private func suggestionCard(_ suggestion: GeniusSuggestion) -> some View {
        Button {
            onSelect(suggestion)
        } label: {
            HStack(spacing: 10) {
                if let artUrl = suggestion.albumArt, let url = URL(string: artUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Theme.dividerColor)
                    }
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(suggestion.title)
                        .font(Theme.dmSans(13, weight: .medium))
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(1)

                    if let artist = suggestion.artist {
                        Text(artist)
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.textSecondary)
                            .lineLimit(1)
                    }
                }
            }
            .padding(8)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
        }
    }
}
