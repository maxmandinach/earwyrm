import Foundation
import Supabase

@Observable
@MainActor
final class ExploreSearchViewModel {
    // MARK: - Results

    var songResults: [GeniusSuggestion] = []
    var artistResults: [MBArtist] = []
    var lyricResults: [Lyric] = []
    var lyricProfileMap: [UUID: String] = [:]

    // MARK: - Loading

    var isSongsLoading = false
    var isArtistsLoading = false
    var isLyricsLoading = false

    var isAnyLoading: Bool {
        isSongsLoading || isArtistsLoading || isLyricsLoading
    }

    var hasNoResults: Bool {
        !isAnyLoading
        && songResults.isEmpty
        && artistResults.isEmpty
        && lyricResults.isEmpty
    }

    // MARK: - Private

    private var songsTask: Task<Void, Never>?
    private var artistsTask: Task<Void, Never>?
    private var lyricsTask: Task<Void, Never>?
    private var lastQuery = ""

    private static let lyricColumns = """
        id, user_id, content, song_title, artist_name, cover_art_url, \
        album_name, is_current, is_public, tags, share_token, \
        canonical_lyric_id, musicbrainz_recording_id, musicbrainz_release_id, \
        reaction_count, comment_count, card_art_url, created_at, replaced_at
        """

    // MARK: - Search

    func search(query: String) {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else {
            clear()
            return
        }
        guard trimmed != lastQuery else { return }
        lastQuery = trimmed

        searchSongs(trimmed)
        searchArtists(trimmed)
        searchLyrics(trimmed)
    }

    func clear() {
        lastQuery = ""
        songsTask?.cancel()
        artistsTask?.cancel()
        lyricsTask?.cancel()
        songResults = []
        artistResults = []
        lyricResults = []
        lyricProfileMap = [:]
        isSongsLoading = false
        isArtistsLoading = false
        isLyricsLoading = false
    }

    // MARK: - Songs (Genius)

    private func searchSongs(_ query: String) {
        songsTask?.cancel()
        isSongsLoading = true

        songsTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }

            let results = await GeniusService.searchSongs(query)
            guard !Task.isCancelled else { return }
            songResults = results
            isSongsLoading = false
        }
    }

    // MARK: - Artists (MusicBrainz)

    private func searchArtists(_ query: String) {
        artistsTask?.cancel()
        isArtistsLoading = true

        artistsTask = Task {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }

            let results = await MusicBrainzService.shared.searchArtists(query: query)
            guard !Task.isCancelled else { return }
            artistResults = results
            isArtistsLoading = false
        }
    }

    // MARK: - Lyrics (Supabase)

    private func searchLyrics(_ query: String) {
        lyricsTask?.cancel()
        isLyricsLoading = true

        lyricsTask = Task {
            try? await Task.sleep(for: .milliseconds(150))
            guard !Task.isCancelled else { return }

            do {
                let q = query.replacingOccurrences(of: "%", with: "")
                let lyrics: [Lyric] = try await supabase
                    .from("lyrics")
                    .select(Self.lyricColumns)
                    .eq("is_public", value: true)
                    .or("content.ilike.%\(q)%,song_title.ilike.%\(q)%,artist_name.ilike.%\(q)%")
                    .order("reaction_count", ascending: false)
                    .limit(10)
                    .execute()
                    .value

                guard !Task.isCancelled else { return }
                lyricResults = lyrics

                // Fetch usernames
                let userIds = Array(Set(lyrics.map(\.userId)))
                if !userIds.isEmpty {
                    let profiles: [CommentProfile] = try await supabase
                        .from("profiles")
                        .select("id, username, subscription_tier")
                        .in("id", values: userIds.map(\.uuidString))
                        .execute()
                        .value
                    guard !Task.isCancelled else { return }
                    for p in profiles {
                        lyricProfileMap[p.id] = p.username
                    }
                }
            } catch {
                print("Explore lyrics search error: \(error)")
            }
            isLyricsLoading = false
        }
    }
}
