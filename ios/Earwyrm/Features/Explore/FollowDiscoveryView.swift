import SwiftUI

struct SuggestedArtist {
    let name: String
    let genre: String
}

struct FollowDiscoveryView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager

    var genreFilter: Set<String> = []

    static let allGenres = [
        "Pop", "Hip-Hop", "Rap", "R&B", "Soul",
        "Rock", "Alternative", "Indie", "Punk", "Metal",
        "Country", "Folk", "Latin", "K-Pop",
        "Electronic", "Jazz", "Jam Band", "Poetry",
    ]

    private static let suggestedArtists: [SuggestedArtist] = [
        // Pop
        SuggestedArtist(name: "Taylor Swift", genre: "Pop"),
        SuggestedArtist(name: "Billie Eilish", genre: "Pop"),
        SuggestedArtist(name: "Olivia Rodrigo", genre: "Pop"),
        SuggestedArtist(name: "Dua Lipa", genre: "Pop"),
        SuggestedArtist(name: "Harry Styles", genre: "Pop"),
        SuggestedArtist(name: "Sabrina Carpenter", genre: "Pop"),
        SuggestedArtist(name: "Beyoncé", genre: "Pop"),
        SuggestedArtist(name: "Ariana Grande", genre: "Pop"),
        SuggestedArtist(name: "Lana Del Rey", genre: "Pop"),
        SuggestedArtist(name: "Charli XCX", genre: "Pop"),
        SuggestedArtist(name: "Chappell Roan", genre: "Pop"),
        SuggestedArtist(name: "Troye Sivan", genre: "Pop"),
        // Hip-Hop
        SuggestedArtist(name: "Kendrick Lamar", genre: "Hip-Hop"),
        SuggestedArtist(name: "Drake", genre: "Hip-Hop"),
        SuggestedArtist(name: "Tyler, the Creator", genre: "Hip-Hop"),
        SuggestedArtist(name: "Travis Scott", genre: "Hip-Hop"),
        SuggestedArtist(name: "J. Cole", genre: "Hip-Hop"),
        SuggestedArtist(name: "Kanye West", genre: "Hip-Hop"),
        SuggestedArtist(name: "MF DOOM", genre: "Hip-Hop"),
        SuggestedArtist(name: "JID", genre: "Hip-Hop"),
        SuggestedArtist(name: "21 Savage", genre: "Hip-Hop"),
        SuggestedArtist(name: "Future", genre: "Hip-Hop"),
        // Rap
        SuggestedArtist(name: "Eminem", genre: "Rap"),
        SuggestedArtist(name: "Nicki Minaj", genre: "Rap"),
        SuggestedArtist(name: "Lil Wayne", genre: "Rap"),
        SuggestedArtist(name: "Mac Miller", genre: "Rap"),
        SuggestedArtist(name: "Tupac", genre: "Rap"),
        SuggestedArtist(name: "Nas", genre: "Rap"),
        SuggestedArtist(name: "Jay-Z", genre: "Rap"),
        SuggestedArtist(name: "A$AP Rocky", genre: "Rap"),
        SuggestedArtist(name: "Joey Bada$$", genre: "Rap"),
        SuggestedArtist(name: "Denzel Curry", genre: "Rap"),
        // R&B
        SuggestedArtist(name: "SZA", genre: "R&B"),
        SuggestedArtist(name: "The Weeknd", genre: "R&B"),
        SuggestedArtist(name: "Frank Ocean", genre: "R&B"),
        SuggestedArtist(name: "Daniel Caesar", genre: "R&B"),
        SuggestedArtist(name: "Steve Lacy", genre: "R&B"),
        SuggestedArtist(name: "Summer Walker", genre: "R&B"),
        SuggestedArtist(name: "Erykah Badu", genre: "R&B"),
        SuggestedArtist(name: "Kehlani", genre: "R&B"),
        // Soul
        SuggestedArtist(name: "Stevie Wonder", genre: "Soul"),
        SuggestedArtist(name: "Marvin Gaye", genre: "Soul"),
        SuggestedArtist(name: "Amy Winehouse", genre: "Soul"),
        SuggestedArtist(name: "Aretha Franklin", genre: "Soul"),
        SuggestedArtist(name: "Al Green", genre: "Soul"),
        SuggestedArtist(name: "Otis Redding", genre: "Soul"),
        SuggestedArtist(name: "Leon Bridges", genre: "Soul"),
        // Rock
        SuggestedArtist(name: "Radiohead", genre: "Rock"),
        SuggestedArtist(name: "Arctic Monkeys", genre: "Rock"),
        SuggestedArtist(name: "Fleetwood Mac", genre: "Rock"),
        SuggestedArtist(name: "The Beatles", genre: "Rock"),
        SuggestedArtist(name: "Led Zeppelin", genre: "Rock"),
        SuggestedArtist(name: "Pink Floyd", genre: "Rock"),
        SuggestedArtist(name: "Queen", genre: "Rock"),
        SuggestedArtist(name: "Nirvana", genre: "Rock"),
        SuggestedArtist(name: "The Strokes", genre: "Rock"),
        SuggestedArtist(name: "David Bowie", genre: "Rock"),
        SuggestedArtist(name: "The Rolling Stones", genre: "Rock"),
        // Alternative
        SuggestedArtist(name: "Gorillaz", genre: "Alternative"),
        SuggestedArtist(name: "The 1975", genre: "Alternative"),
        SuggestedArtist(name: "Glass Animals", genre: "Alternative"),
        SuggestedArtist(name: "Cage the Elephant", genre: "Alternative"),
        SuggestedArtist(name: "Twenty One Pilots", genre: "Alternative"),
        SuggestedArtist(name: "The Smashing Pumpkins", genre: "Alternative"),
        SuggestedArtist(name: "Pixies", genre: "Alternative"),
        SuggestedArtist(name: "Weezer", genre: "Alternative"),
        // Indie
        SuggestedArtist(name: "Phoebe Bridgers", genre: "Indie"),
        SuggestedArtist(name: "Hozier", genre: "Indie"),
        SuggestedArtist(name: "Tame Impala", genre: "Indie"),
        SuggestedArtist(name: "Bon Iver", genre: "Indie"),
        SuggestedArtist(name: "Mitski", genre: "Indie"),
        SuggestedArtist(name: "Clairo", genre: "Indie"),
        SuggestedArtist(name: "Vampire Weekend", genre: "Indie"),
        SuggestedArtist(name: "The National", genre: "Indie"),
        SuggestedArtist(name: "Japanese Breakfast", genre: "Indie"),
        SuggestedArtist(name: "Boygenius", genre: "Indie"),
        SuggestedArtist(name: "Alex G", genre: "Indie"),
        SuggestedArtist(name: "Beach House", genre: "Indie"),
        // Punk
        SuggestedArtist(name: "The Clash", genre: "Punk"),
        SuggestedArtist(name: "Green Day", genre: "Punk"),
        SuggestedArtist(name: "Blink-182", genre: "Punk"),
        SuggestedArtist(name: "My Chemical Romance", genre: "Punk"),
        SuggestedArtist(name: "Turnstile", genre: "Punk"),
        SuggestedArtist(name: "Paramore", genre: "Punk"),
        SuggestedArtist(name: "The Ramones", genre: "Punk"),
        // Metal
        SuggestedArtist(name: "Metallica", genre: "Metal"),
        SuggestedArtist(name: "Tool", genre: "Metal"),
        SuggestedArtist(name: "Deftones", genre: "Metal"),
        SuggestedArtist(name: "System of a Down", genre: "Metal"),
        SuggestedArtist(name: "Gojira", genre: "Metal"),
        SuggestedArtist(name: "Slipknot", genre: "Metal"),
        SuggestedArtist(name: "Black Sabbath", genre: "Metal"),
        // Country
        SuggestedArtist(name: "Zach Bryan", genre: "Country"),
        SuggestedArtist(name: "Noah Kahan", genre: "Country"),
        SuggestedArtist(name: "Morgan Wallen", genre: "Country"),
        SuggestedArtist(name: "Chris Stapleton", genre: "Country"),
        SuggestedArtist(name: "Kacey Musgraves", genre: "Country"),
        SuggestedArtist(name: "Tyler Childers", genre: "Country"),
        SuggestedArtist(name: "Sturgill Simpson", genre: "Country"),
        SuggestedArtist(name: "Johnny Cash", genre: "Country"),
        SuggestedArtist(name: "Willie Nelson", genre: "Country"),
        // Folk
        SuggestedArtist(name: "Iron & Wine", genre: "Folk"),
        SuggestedArtist(name: "Fleet Foxes", genre: "Folk"),
        SuggestedArtist(name: "Joni Mitchell", genre: "Folk"),
        SuggestedArtist(name: "Nick Drake", genre: "Folk"),
        SuggestedArtist(name: "Elliott Smith", genre: "Folk"),
        SuggestedArtist(name: "Adrianne Lenker", genre: "Folk"),
        SuggestedArtist(name: "Bob Dylan", genre: "Folk"),
        SuggestedArtist(name: "Simon & Garfunkel", genre: "Folk"),
        SuggestedArtist(name: "Sufjan Stevens", genre: "Folk"),
        // Latin
        SuggestedArtist(name: "Bad Bunny", genre: "Latin"),
        SuggestedArtist(name: "Peso Pluma", genre: "Latin"),
        SuggestedArtist(name: "Rosalía", genre: "Latin"),
        SuggestedArtist(name: "Karol G", genre: "Latin"),
        SuggestedArtist(name: "Rauw Alejandro", genre: "Latin"),
        SuggestedArtist(name: "Feid", genre: "Latin"),
        SuggestedArtist(name: "J Balvin", genre: "Latin"),
        SuggestedArtist(name: "Shakira", genre: "Latin"),
        // K-Pop
        SuggestedArtist(name: "BTS", genre: "K-Pop"),
        SuggestedArtist(name: "BLACKPINK", genre: "K-Pop"),
        SuggestedArtist(name: "NewJeans", genre: "K-Pop"),
        SuggestedArtist(name: "Stray Kids", genre: "K-Pop"),
        SuggestedArtist(name: "aespa", genre: "K-Pop"),
        SuggestedArtist(name: "TWICE", genre: "K-Pop"),
        SuggestedArtist(name: "LE SSERAFIM", genre: "K-Pop"),
        // Electronic
        SuggestedArtist(name: "Fred again..", genre: "Electronic"),
        SuggestedArtist(name: "Aphex Twin", genre: "Electronic"),
        SuggestedArtist(name: "Daft Punk", genre: "Electronic"),
        SuggestedArtist(name: "Flume", genre: "Electronic"),
        SuggestedArtist(name: "ODESZA", genre: "Electronic"),
        SuggestedArtist(name: "Jamie xx", genre: "Electronic"),
        SuggestedArtist(name: "Disclosure", genre: "Electronic"),
        SuggestedArtist(name: "Caribou", genre: "Electronic"),
        SuggestedArtist(name: "Four Tet", genre: "Electronic"),
        // Jazz
        SuggestedArtist(name: "Miles Davis", genre: "Jazz"),
        SuggestedArtist(name: "John Coltrane", genre: "Jazz"),
        SuggestedArtist(name: "Kamasi Washington", genre: "Jazz"),
        SuggestedArtist(name: "Norah Jones", genre: "Jazz"),
        SuggestedArtist(name: "Robert Glasper", genre: "Jazz"),
        SuggestedArtist(name: "Thelonious Monk", genre: "Jazz"),
        SuggestedArtist(name: "Nina Simone", genre: "Jazz"),
        // Jam Band
        SuggestedArtist(name: "Grateful Dead", genre: "Jam Band"),
        SuggestedArtist(name: "Phish", genre: "Jam Band"),
        SuggestedArtist(name: "Widespread Panic", genre: "Jam Band"),
        SuggestedArtist(name: "Goose", genre: "Jam Band"),
        SuggestedArtist(name: "Billy Strings", genre: "Jam Band"),
        SuggestedArtist(name: "Khruangbin", genre: "Jam Band"),
        SuggestedArtist(name: "The Allman Brothers Band", genre: "Jam Band"),
        SuggestedArtist(name: "String Cheese Incident", genre: "Jam Band"),
        // Poetry
        SuggestedArtist(name: "Rupi Kaur", genre: "Poetry"),
        SuggestedArtist(name: "Amanda Gorman", genre: "Poetry"),
        SuggestedArtist(name: "Ocean Vuong", genre: "Poetry"),
        SuggestedArtist(name: "Mary Oliver", genre: "Poetry"),
        SuggestedArtist(name: "Lang Leav", genre: "Poetry"),
        SuggestedArtist(name: "Atticus", genre: "Poetry"),
        SuggestedArtist(name: "Warsan Shire", genre: "Poetry"),
        SuggestedArtist(name: "Pablo Neruda", genre: "Poetry"),
        SuggestedArtist(name: "Sylvia Plath", genre: "Poetry"),
        SuggestedArtist(name: "Edgar Allan Poe", genre: "Poetry"),
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
    @State private var currentSearchId: UUID?

    /// Local recommended artists matching the query (instant, no network)
    private var localMatches: [SuggestedArtist] {
        guard query.count >= 2 else { return [] }
        let q = query.lowercased()
        return Self.suggestedArtists.filter { $0.name.lowercased().contains(q) }
    }

    /// Names already shown from API results, used to de-dupe local matches
    private var apiNames: Set<String> {
        Set(searchResults.map { $0.name.lowercased() })
    }

    /// Local matches not already in API results
    private var uniqueLocalMatches: [SuggestedArtist] {
        localMatches.filter { !apiNames.contains($0.name.lowercased()) }
    }

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
                    isSearching = false
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
                currentSearchId = nil
                return
            }
            let thisSearchId = UUID()
            currentSearchId = thisSearchId
            isSearching = true
            searchTask = Task {
                try? await Task.sleep(for: .milliseconds(300))
                guard currentSearchId == thisSearchId else { return }
                let results = await MusicBrainzService.shared.searchArtists(query: newValue, limit: 8)
                guard currentSearchId == thisSearchId else { return }
                searchResults = results
                isSearching = false
            }
        }
    }

    // MARK: - Search Results

    private var searchResultsList: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Show local matches immediately (no network needed)
            if !uniqueLocalMatches.isEmpty {
                ForEach(uniqueLocalMatches, id: \.name) { artist in
                    artistRow(name: artist.name, disambiguation: nil)
                        .padding(.horizontal, Theme.Spacing.md)

                    Divider()
                        .foregroundStyle(Theme.dividerColor)
                        .padding(.horizontal, Theme.Spacing.md)
                }
            }

            // API results
            if isSearching && searchResults.isEmpty && uniqueLocalMatches.isEmpty {
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
            } else if isSearching && searchResults.isEmpty {
                // Local results are showing, add subtle loading indicator
                HStack {
                    ProgressView()
                        .scaleEffect(0.6)
                        .tint(Theme.textMuted)
                    Text("searching more...")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                }
                .padding(8)
                .padding(.horizontal, Theme.Spacing.md)
            } else if searchResults.isEmpty && uniqueLocalMatches.isEmpty && query.count >= 2 {
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
