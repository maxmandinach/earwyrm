import SwiftUI

struct ArtistAutocompleteView: View {
    let artists: [MBArtist]
    let isLoading: Bool
    let onSelect: (MBArtist) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if isLoading {
                HStack {
                    ProgressView()
                        .scaleEffect(0.7)
                        .tint(Theme.Light.muted)
                    Text("searching artists...")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.Light.muted)
                }
                .padding(12)
            } else {
                ForEach(artists) { artist in
                    Button {
                        onSelect(artist)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(artist.name)
                                .font(Theme.dmSans(14, weight: .medium))
                                .foregroundStyle(Theme.Light.text)

                            HStack(spacing: 6) {
                                if let disambiguation = artist.disambiguation, !disambiguation.isEmpty {
                                    Text(disambiguation)
                                        .font(Theme.dmSans(12))
                                        .foregroundStyle(Theme.Light.muted)
                                        .lineLimit(1)
                                }
                                if let country = artist.country, !country.isEmpty {
                                    Text(country)
                                        .font(Theme.dmSans(11, weight: .medium))
                                        .foregroundStyle(Theme.Light.accent)
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 1)
                                        .background(Theme.Light.accent.opacity(0.12))
                                        .clipShape(RoundedRectangle(cornerRadius: 3))
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                    }

                    if artist.id != artists.last?.id {
                        Divider()
                            .foregroundStyle(Theme.Light.divider)
                    }
                }
            }
        }
        .background(Theme.Light.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Theme.Light.divider, lineWidth: 1)
        )
    }
}
