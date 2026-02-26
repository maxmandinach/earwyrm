import SwiftUI
import Supabase

struct FollowedArtistsSection: View {
    let follows: [Follow]

    @State private var coverArtMap: [String: String] = [:]

    private var artistFollows: [Follow] {
        follows.filter { $0.filterType == "artist" }
    }

    var body: some View {
        if !artistFollows.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                CaveatText(text: "your artists", size: 24, color: Theme.textSecondary)
                    .padding(.horizontal, Theme.Spacing.lg)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Spacing.md) {
                        ForEach(artistFollows) { follow in
                            NavigationLink(value: ArtistDestination(name: follow.filterValue)) {
                                artistTile(name: follow.filterValue)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.lg)
                }
            }
            .task {
                await fetchCoverArt()
            }
        }
    }

    private func artistTile(name: String) -> some View {
        VStack(spacing: Theme.Spacing.sm) {
            if let urlString = coverArtMap[name],
               let url = URL(string: urlString) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    initialCircle(name: name)
                }
                .frame(width: 64, height: 64)
                .clipShape(Circle())
                .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
            } else {
                initialCircle(name: name)
                    .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
            }

            Text(name)
                .font(Theme.dmSans(12))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(1)
        }
        .frame(width: 72)
    }

    private func initialCircle(name: String) -> some View {
        Circle()
            .fill(Theme.accent.opacity(0.3))
            .frame(width: 64, height: 64)
            .overlay(
                CaveatText(
                    text: String(name.prefix(1)).uppercased(),
                    size: 24,
                    weight: .bold,
                    color: Theme.textPrimary
                )
            )
    }

    private func fetchCoverArt() async {
        // Response type for the cover art query
        struct CoverArtRow: Decodable {
            let coverArtUrl: String

            enum CodingKeys: String, CodingKey {
                case coverArtUrl = "cover_art_url"
            }
        }

        for follow in artistFollows {
            let name = follow.filterValue
            do {
                let rows: [CoverArtRow] = try await supabase
                    .from("lyrics")
                    .select("cover_art_url")
                    .ilike("artist_name", pattern: name)
                    .not("cover_art_url", operator: .is, value: "null")
                    .limit(1)
                    .execute()
                    .value

                if let url = rows.first?.coverArtUrl {
                    coverArtMap[name] = url
                }
            } catch {
                // Silently skip — tile will show initial fallback
            }
        }
    }
}
