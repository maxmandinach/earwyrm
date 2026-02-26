import SwiftUI

struct SuggestedArtist {
    let name: String
    let genre: String
}

struct FollowDiscoveryView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager

    var genreFilter: Set<String> = []

    static let allGenres = ["Pop", "Hip-Hop", "R&B", "Rock", "Indie", "Country", "Latin"]

    private static let suggestedArtists: [SuggestedArtist] = [
        // Pop
        SuggestedArtist(name: "Taylor Swift", genre: "Pop"),
        SuggestedArtist(name: "Billie Eilish", genre: "Pop"),
        SuggestedArtist(name: "Olivia Rodrigo", genre: "Pop"),
        SuggestedArtist(name: "Dua Lipa", genre: "Pop"),
        SuggestedArtist(name: "Harry Styles", genre: "Pop"),
        SuggestedArtist(name: "Sabrina Carpenter", genre: "Pop"),
        SuggestedArtist(name: "Beyoncé", genre: "Pop"),
        // Hip-Hop
        SuggestedArtist(name: "Kendrick Lamar", genre: "Hip-Hop"),
        SuggestedArtist(name: "Drake", genre: "Hip-Hop"),
        SuggestedArtist(name: "Tyler, the Creator", genre: "Hip-Hop"),
        // R&B
        SuggestedArtist(name: "SZA", genre: "R&B"),
        SuggestedArtist(name: "The Weeknd", genre: "R&B"),
        SuggestedArtist(name: "Frank Ocean", genre: "R&B"),
        // Rock
        SuggestedArtist(name: "Radiohead", genre: "Rock"),
        SuggestedArtist(name: "Arctic Monkeys", genre: "Rock"),
        SuggestedArtist(name: "Fleetwood Mac", genre: "Rock"),
        SuggestedArtist(name: "The Beatles", genre: "Rock"),
        SuggestedArtist(name: "Led Zeppelin", genre: "Rock"),
        // Indie
        SuggestedArtist(name: "Phoebe Bridgers", genre: "Indie"),
        SuggestedArtist(name: "Hozier", genre: "Indie"),
        SuggestedArtist(name: "Tame Impala", genre: "Indie"),
        SuggestedArtist(name: "Bon Iver", genre: "Indie"),
        // Country
        SuggestedArtist(name: "Zach Bryan", genre: "Country"),
        SuggestedArtist(name: "Noah Kahan", genre: "Country"),
        // Latin
        SuggestedArtist(name: "Bad Bunny", genre: "Latin"),
    ]

    private var filteredArtists: [SuggestedArtist] {
        if genreFilter.isEmpty {
            return Self.suggestedArtists
        }
        return Self.suggestedArtists.filter { genreFilter.contains($0.genre) }
    }

    @State private var query = ""
    @State private var searchResults: [MBArtist] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        VStack(spacing: Theme.Spacing.md) {
            searchField
                .padding(.horizontal, Theme.Spacing.md)

            if !query.isEmpty {
                searchResultsList
            } else {
                trendingSection
            }
        }
    }

    // MARK: - Search Field

    private var searchField: some View {
        HStack(spacing: Theme.Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundStyle(Theme.textMuted)

            TextField("Search artists...", text: $query)
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textPrimary)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)

            if !query.isEmpty {
                Button {
                    query = ""
                    searchResults = []
                    Haptics.light()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                        .frame(width: 28, height: 28)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .onChange(of: query) { _, newValue in
            searchTask?.cancel()
            guard newValue.count >= 2 else {
                searchResults = []
                isSearching = false
                return
            }
            isSearching = true
            searchTask = Task {
                try? await Task.sleep(for: .milliseconds(300))
                guard !Task.isCancelled else { return }
                let results = await MusicBrainzService.shared.searchArtists(query: newValue, limit: 5)
                guard !Task.isCancelled else { return }
                searchResults = results
                isSearching = false
            }
        }
    }

    // MARK: - Search Results

    private var searchResultsList: some View {
        VStack(alignment: .leading, spacing: 0) {
            if isSearching && searchResults.isEmpty {
                HStack {
                    ProgressView()
                        .scaleEffect(0.7)
                        .tint(Theme.textMuted)
                    Text("searching artists...")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textMuted)
                }
                .padding(12)
                .padding(.horizontal, Theme.Spacing.md)
            } else if searchResults.isEmpty && query.count >= 2 {
                Text("No artists found")
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.textMuted)
                    .padding(12)
                    .padding(.horizontal, Theme.Spacing.md)
            } else {
                ForEach(searchResults) { artist in
                    artistRow(name: artist.name, disambiguation: artist.disambiguation)
                        .padding(.horizontal, Theme.Spacing.md)

                    if artist.id != searchResults.last?.id {
                        Divider()
                            .foregroundStyle(Theme.dividerColor)
                            .padding(.horizontal, Theme.Spacing.md)
                    }
                }
            }
        }
    }

    // MARK: - Trending Section

    private var trendingSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("popular artists")
                .font(Theme.caveat(18))
                .foregroundStyle(Theme.textSecondary)
                .padding(.horizontal, Theme.Spacing.md)

            ForEach(filteredArtists, id: \.name) { artist in
                artistRow(name: artist.name, disambiguation: nil)
                    .padding(.horizontal, Theme.Spacing.md)
            }
        }
    }

    // MARK: - Artist Row

    private func artistRow(name: String, disambiguation: String?) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)

                if let disambiguation, !disambiguation.isEmpty {
                    Text(disambiguation)
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let userId = auth.userId {
                FollowButton(
                    isFollowing: followManager.isFollowing(type: "artist", value: name)
                ) {
                    Task {
                        if followManager.isFollowing(type: "artist", value: name) {
                            await followManager.unfollow(userId: userId, type: "artist", value: name)
                        } else {
                            await followManager.follow(userId: userId, type: "artist", value: name)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 6)
    }
}
