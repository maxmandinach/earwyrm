import Foundation
import Supabase

@Observable
@MainActor
final class PostLyricViewModel {
    // MARK: - Form State

    var content = ""
    var artistName = ""
    var songTitle = ""
    var tags: [String] = []
    var coverArtUrl: String?
    var albumName: String?
    var canonicalLyricId: UUID?
    var musicbrainzRecordingId: String?
    var musicbrainzReleaseId: String?
    var isContentLocked = false

    // MARK: - Note State

    var noteContent = ""
    var noteIsPublic = false
    var showNoteField = false

    // MARK: - Genius State

    var geniusSuggestions: [GeniusSuggestion] = []
    var isGeniusLoading = false
    var geniusDismissed = false

    // MARK: - MusicBrainz State

    var artistResults: [MBArtist] = []
    var isArtistSearching = false
    var artistMbid: String?

    var songResults: [MappedRecording] = []
    var isSongSearching = false
    var isCoverArtLoading = false

    // MARK: - Suggest Matches State

    var suggestMatches: [SuggestMatch] = []
    var selectedMatchId: UUID?

    // MARK: - Ghost Text (LRCLIB) State

    var fullLyrics: String?
    var ghostText: String?
    var isLoadingLyrics = false
    private var lyricsArtist = ""
    private var lyricsSong = ""
    private var lyricsFetchTask: Task<Void, Never>?

    // MARK: - Save State

    var isSaving = false
    var saveError: String?

    // MARK: - Autocomplete Visibility

    var showArtistAutocomplete = false
    var showSongAutocomplete = false

    // MARK: - Debounce Tasks

    private var geniusDebounceTask: Task<Void, Never>?
    private var artistDebounceTask: Task<Void, Never>?
    private var songDebounceTask: Task<Void, Never>?
    private var matchDebounceTask: Task<Void, Never>?
    private var lastGeniusQuery = ""
    private var lastMatchQuery = ""

    // MARK: - Computed

    var canSave: Bool {
        !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSaving
    }

    var shouldShowGenius: Bool {
        !geniusDismissed
        && (isGeniusLoading || !geniusSuggestions.isEmpty)
        && artistName.trimmingCharacters(in: .whitespaces).isEmpty
        && songTitle.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Content Changed

    func contentDidChange() {
        geniusDismissed = false
        triggerGeniusSearch()
        triggerMatchSearch()
        computeGhostText()
    }

    // MARK: - Genius Pipeline

    private func triggerGeniusSearch() {
        geniusDebounceTask?.cancel()

        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 15,
              artistName.trimmingCharacters(in: .whitespaces).isEmpty,
              songTitle.trimmingCharacters(in: .whitespaces).isEmpty,
              !geniusDismissed else {
            geniusSuggestions = []
            isGeniusLoading = false
            return
        }

        guard trimmed != lastGeniusQuery else { return }
        isGeniusLoading = true

        geniusDebounceTask = Task {
            try? await Task.sleep(for: .milliseconds(800))
            guard !Task.isCancelled else { return }

            lastGeniusQuery = trimmed
            let results = await GeniusService.searchByLyrics(trimmed)

            guard !Task.isCancelled else { return }
            geniusSuggestions = results
            isGeniusLoading = false
        }
    }

    func selectGeniusSuggestion(_ suggestion: GeniusSuggestion) {
        artistName = suggestion.artist ?? ""
        songTitle = suggestion.title
        coverArtUrl = suggestion.albumArt
        geniusSuggestions = []
        geniusDismissed = true
        showArtistAutocomplete = false
        showSongAutocomplete = false
        fetchLyricsIfNeeded()
    }

    func dismissGenius() {
        geniusDismissed = true
        geniusSuggestions = []
        isGeniusLoading = false
    }

    // MARK: - Artist Autocomplete

    func artistFieldChanged() {
        artistDebounceTask?.cancel()

        let trimmed = artistName.trimmingCharacters(in: .whitespaces)
        guard trimmed.count >= 2 else {
            artistResults = []
            isArtistSearching = false
            showArtistAutocomplete = false
            return
        }

        isArtistSearching = true
        showArtistAutocomplete = true

        artistDebounceTask = Task {
            try? await Task.sleep(for: .milliseconds(200))
            guard !Task.isCancelled else { return }

            let results = await MusicBrainzService.shared.searchArtists(query: trimmed)

            guard !Task.isCancelled else { return }
            artistResults = results
            isArtistSearching = false
        }
    }

    func selectArtist(_ artist: MBArtist) {
        artistName = artist.name
        artistMbid = artist.id
        artistResults = []
        showArtistAutocomplete = false

        // Clear song results since artist changed
        songResults = []
        songTitle = ""
        coverArtUrl = nil
        musicbrainzRecordingId = nil
        musicbrainzReleaseId = nil
        albumName = nil
    }

    // MARK: - Song Autocomplete

    func songFieldChanged() {
        songDebounceTask?.cancel()

        let trimmed = songTitle.trimmingCharacters(in: .whitespaces)
        guard trimmed.count >= 2, let mbid = artistMbid else {
            songResults = []
            isSongSearching = false
            showSongAutocomplete = false
            return
        }

        isSongSearching = true
        showSongAutocomplete = true

        songDebounceTask = Task {
            try? await Task.sleep(for: .milliseconds(200))
            guard !Task.isCancelled else { return }

            let results = await MusicBrainzService.shared.searchRecordingsByArtistId(
                artistId: mbid, query: trimmed
            )

            guard !Task.isCancelled else { return }
            songResults = results
            isSongSearching = false
        }
    }

    func selectRecording(_ recording: MappedRecording) {
        songTitle = recording.title
        albumName = recording.album
        musicbrainzRecordingId = recording.id
        musicbrainzReleaseId = recording.releaseId
        songResults = []
        showSongAutocomplete = false

        // Fetch cover art
        isCoverArtLoading = true
        Task {
            let url = await MusicBrainzService.shared.getCoverArt(
                releaseGroupId: recording.releaseGroupId,
                releaseId: recording.releaseId
            )
            isCoverArtLoading = false
            coverArtUrl = url
        }

        fetchLyricsIfNeeded()
    }

    // MARK: - Suggest Matches

    func triggerMatchSearchFromSong() {
        triggerMatchSearch()
    }

    private func triggerMatchSearch() {
        matchDebounceTask?.cancel()

        let trimmedContent = content.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedTitle = songTitle.trimmingCharacters(in: .whitespaces)
        let hasContent = trimmedContent.count >= 3
        let hasTitle = trimmedTitle.count >= 3

        guard hasContent || hasTitle else {
            suggestMatches = []
            return
        }

        let queryKey = "\(trimmedContent)|\(trimmedTitle)"
        guard queryKey != lastMatchQuery else { return }

        matchDebounceTask = Task {
            try? await Task.sleep(for: .milliseconds(150))
            guard !Task.isCancelled else { return }

            lastMatchQuery = queryKey

            do {
                var allMatches: [SuggestMatch] = []
                var seenIds = Set<UUID>()

                if hasContent {
                    let snippet = String(trimmedContent.prefix(60))
                    let contentMatches: [SuggestMatch] = try await supabase
                        .from("lyrics")
                        .select("id, content, artist_name, song_title")
                        .eq("is_public", value: true)
                        .ilike("content", pattern: "%\(snippet)%")
                        .order("reaction_count", ascending: false)
                        .limit(5)
                        .execute()
                        .value

                    for match in contentMatches where !seenIds.contains(match.id) {
                        seenIds.insert(match.id)
                        allMatches.append(match)
                    }
                }

                if hasTitle {
                    let titleMatches: [SuggestMatch] = try await supabase
                        .from("lyrics")
                        .select("id, content, artist_name, song_title")
                        .eq("is_public", value: true)
                        .ilike("song_title", pattern: "%\(trimmedTitle)%")
                        .order("reaction_count", ascending: false)
                        .limit(5)
                        .execute()
                        .value

                    for match in titleMatches where !seenIds.contains(match.id) {
                        seenIds.insert(match.id)
                        allMatches.append(match)
                    }
                }

                guard !Task.isCancelled else { return }
                suggestMatches = Array(allMatches.prefix(5))
            } catch {
                print("Suggest matches error: \(error)")
            }
        }
    }

    func selectMatch(_ match: SuggestMatch?) {
        if let match {
            selectedMatchId = match.id
            content = match.content
            artistName = match.artistName ?? ""
            songTitle = match.songTitle ?? ""
            canonicalLyricId = match.id
            isContentLocked = true
            ghostText = nil
        } else {
            selectedMatchId = nil
            canonicalLyricId = nil
            isContentLocked = false
        }
    }

    // MARK: - Save

    func saveLyric(userId: UUID, currentLyricId: UUID?, isPublicProfile: Bool) async -> Bool {
        guard canSave else { return false }

        isSaving = true
        saveError = nil

        do {
            // 1. Archive current lyric if exists
            if let currentId = currentLyricId {
                let archive = LyricArchiveUpdate(
                    isCurrent: false,
                    replacedAt: ISO8601DateFormatter().string(from: Date())
                )
                try await supabase
                    .from("lyrics")
                    .update(archive)
                    .eq("id", value: currentId.uuidString)
                    .execute()
            }

            // 2. Build and insert new lyric
            let trimmedArtist = artistName.trimmingCharacters(in: .whitespaces)
            let trimmedSong = songTitle.trimmingCharacters(in: .whitespaces)
            let trimmedContent = content.trimmingCharacters(in: .whitespacesAndNewlines)

            let insert = LyricInsert(
                content: trimmedContent,
                songTitle: trimmedSong.isEmpty ? nil : trimmedSong,
                artistName: trimmedArtist.isEmpty ? nil : trimmedArtist,
                coverArtUrl: coverArtUrl,
                albumName: albumName,
                tags: tags.isEmpty ? nil : tags,
                isPublic: isPublicProfile,
                isCurrent: true,
                canonicalLyricId: canonicalLyricId,
                musicbrainzRecordingId: musicbrainzRecordingId,
                musicbrainzReleaseId: musicbrainzReleaseId
            )

            let insertedLyrics: [Lyric] = try await supabase
                .from("lyrics")
                .insert(insert)
                .select()
                .execute()
                .value

            // 3. Insert note if provided
            let trimmedNote = noteContent.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmedNote.isEmpty, let newLyricId = insertedLyrics.first?.id {
                let noteInsert = NoteInsert(
                    lyricId: newLyricId,
                    userId: userId,
                    content: trimmedNote,
                    isPublic: noteIsPublic
                )
                try await supabase
                    .from("lyric_notes")
                    .insert(noteInsert)
                    .execute()
            }

            isSaving = false
            return true
        } catch {
            saveError = error.localizedDescription
            isSaving = false
            return false
        }
    }

    // MARK: - Ghost Text (LRCLIB)

    private func fetchLyricsIfNeeded() {
        let artist = artistName.trimmingCharacters(in: .whitespaces)
        let song = songTitle.trimmingCharacters(in: .whitespaces)
        guard !artist.isEmpty, !song.isEmpty else { return }
        guard artist != lyricsArtist || song != lyricsSong else { return }

        lyricsArtist = artist
        lyricsSong = song
        isLoadingLyrics = true

        lyricsFetchTask?.cancel()
        lyricsFetchTask = Task {
            let lyrics = await LRCLIBService.fetchLyrics(artist: artist, title: song)
            guard !Task.isCancelled else { return }
            fullLyrics = lyrics
            isLoadingLyrics = false
            computeGhostText()
        }
    }

    func computeGhostText() {
        guard let lyrics = fullLyrics,
              !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !isContentLocked else {
            ghostText = nil
            return
        }

        let normalizedContent = normalize(content)
        let normalizedLyrics = normalize(lyrics)

        // Take last 40 chars of user's normalized text as search key
        let searchLength = min(40, normalizedContent.count)
        guard searchLength >= 5 else {
            ghostText = nil
            return
        }
        let searchKey = String(normalizedContent.suffix(searchLength))

        // Find search key in normalized lyrics
        guard let matchRange = normalizedLyrics.range(of: searchKey) else {
            ghostText = nil
            return
        }

        // Map match end back to original lyrics
        let matchEndOffset = normalizedLyrics.distance(
            from: normalizedLyrics.startIndex,
            to: matchRange.upperBound
        )
        let originalIndex = mapNormalizedOffset(matchEndOffset, in: lyrics)

        // Find next verse break (\n\n) from that position
        let remaining = String(lyrics[originalIndex...])
        let verseBreak: String.Index
        if let breakRange = remaining.range(of: "\n\n") {
            verseBreak = breakRange.lowerBound
        } else {
            verseBreak = remaining.endIndex
        }

        var ghost = String(remaining[remaining.startIndex..<verseBreak])

        // Trim leading newline — user's current line is already complete
        if ghost.hasPrefix("\n") {
            ghost = String(ghost.dropFirst())
        }

        ghostText = ghost.isEmpty ? nil : ghost
    }

    @discardableResult
    func acceptGhostText() -> Bool {
        guard let ghost = ghostText, !ghost.isEmpty else { return false }
        content += ghost
        ghostText = nil
        computeGhostText()
        return true
    }

    // MARK: - Normalization Helpers

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

    /// Map a character offset in the normalized string back to the corresponding
    /// index in the original string.
    private func mapNormalizedOffset(_ offset: Int, in original: String) -> String.Index {
        var normalizedCount = 0
        var lastValidIndex = original.startIndex
        var prevWasSpace = false

        for index in original.indices {
            if normalizedCount >= offset { return index }

            let char = original[index]
            let lower = char.lowercased()

            if char.isWhitespace {
                if !prevWasSpace {
                    normalizedCount += 1
                    prevWasSpace = true
                }
            } else if lower.rangeOfCharacter(from: CharacterSet.alphanumerics) != nil {
                normalizedCount += 1
                prevWasSpace = false
            }
            // punctuation is stripped — doesn't advance normalizedCount

            lastValidIndex = original.index(after: index)
        }
        return lastValidIndex
    }

    // MARK: - Cleanup

    func cancelAllTasks() {
        geniusDebounceTask?.cancel()
        artistDebounceTask?.cancel()
        songDebounceTask?.cancel()
        matchDebounceTask?.cancel()
        lyricsFetchTask?.cancel()
    }
}
