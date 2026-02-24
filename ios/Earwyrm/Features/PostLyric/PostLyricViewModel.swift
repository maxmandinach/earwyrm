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
    var toast: ToastManager?

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

    var shouldShowMetadata: Bool {
        isMetadataConfirmed || showManualMetadata
    }

    var showManualMetadata = false

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

            // Pre-fetch lyrics for the top suggestion so ghost text is instant on tap
            if let top = results.first, let artist = top.artist, !artist.isEmpty {
                self.prefetchLyrics(artist: artist, title: top.title)
            }
        }
    }

    private var prefetchTask: Task<Void, Never>?
    private var prefetchedLyrics: String?
    private var prefetchedArtist = ""
    private var prefetchedSong = ""

    private func prefetchLyrics(artist: String, title: String) {
        prefetchTask?.cancel()
        prefetchedArtist = artist
        prefetchedSong = title
        prefetchTask = Task {
            let lyrics = await LRCLIBService.fetchLyrics(artist: artist, title: title)
            guard !Task.isCancelled else { return }
            prefetchedLyrics = lyrics
        }
    }

    var isMetadataConfirmed = false

    func selectGeniusSuggestion(_ suggestion: GeniusSuggestion) {
        artistName = suggestion.artist ?? ""
        songTitle = suggestion.title
        coverArtUrl = suggestion.albumArt
        geniusSuggestions = []
        geniusDismissed = true
        isMetadataConfirmed = true
        showArtistAutocomplete = false
        showSongAutocomplete = false
        fetchLyricsIfNeeded()
    }

    func editMetadata() {
        isMetadataConfirmed = false
        showManualMetadata = true
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
            toast?.show("couldn't post lyric, try again")
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

        // Use prefetched lyrics if they match
        if artist == prefetchedArtist, song == prefetchedSong, let cached = prefetchedLyrics {
            fullLyrics = cached
            computeGhostText()
            return
        }

        // If prefetch is in-flight for this song, wait for it
        if artist == prefetchedArtist, song == prefetchedSong, let task = prefetchTask {
            isLoadingLyrics = true
            lyricsFetchTask?.cancel()
            lyricsFetchTask = Task {
                _ = await task.value
                guard !Task.isCancelled else { return }
                fullLyrics = prefetchedLyrics
                isLoadingLyrics = false
                computeGhostText()
            }
            return
        }

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

        // Build normalized lyrics with an index map back to original positions
        let (normalizedLyrics, indexMap) = normalizeWithMapping(lyrics)
        let normalizedContent = normalize(content)

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

        // Map match end back to original lyrics using the index map
        let normalizedEndOffset = normalizedLyrics.distance(
            from: normalizedLyrics.startIndex,
            to: matchRange.upperBound
        )

        let originalStartIndex: String.Index
        if normalizedEndOffset < indexMap.count {
            originalStartIndex = indexMap[normalizedEndOffset]
        } else {
            // Match ends at the very end of lyrics
            originalStartIndex = lyrics.endIndex
        }

        guard originalStartIndex < lyrics.endIndex else {
            ghostText = nil
            return
        }

        // Don't offer ghost text past 500 chars (aligns with orange counter)
        guard content.count < 500 else {
            ghostText = nil
            return
        }

        // Extract up to ~4 lines from that position
        let remaining = String(lyrics[originalStartIndex...])
        var ghost = extractLines(from: remaining, maxLines: 4)

        // Trim leading newlines
        while ghost.hasPrefix("\n") {
            ghost = String(ghost.dropFirst())
        }

        // Ensure there's a space/newline between user's text and ghost text
        if !ghost.isEmpty,
           let lastChar = content.last, !lastChar.isWhitespace && !lastChar.isNewline,
           let firstGhost = ghost.first, !firstGhost.isWhitespace && !firstGhost.isNewline {
            ghost = "\n" + ghost
        }

        // Cap ghost text so total doesn't exceed ~500 chars
        let budget = max(0, 500 - content.count)
        if ghost.count > budget {
            // Trim to budget, breaking at last newline
            let trimmed = String(ghost.prefix(budget))
            if let lastNewline = trimmed.lastIndex(of: "\n") {
                ghost = String(trimmed[...lastNewline])
            } else {
                ghost = trimmed
            }
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

    /// Extract up to `maxLines` non-empty lines from the text.
    /// Stops at a verse break (\n\n) only after at least 2 lines.
    private func extractLines(from text: String, maxLines: Int) -> String {
        var lines: [String] = []
        var remaining = text[text.startIndex...]

        while lines.count < maxLines, !remaining.isEmpty {
            if let newline = remaining.firstIndex(of: "\n") {
                let line = String(remaining[remaining.startIndex..<newline])
                remaining = remaining[remaining.index(after: newline)...]

                // Check for verse break (blank line)
                if line.trimmingCharacters(in: .whitespaces).isEmpty {
                    if lines.count >= 2 { break }
                    continue
                }
                lines.append(line)
            } else {
                // Last line with no trailing newline
                let line = String(remaining)
                if !line.trimmingCharacters(in: .whitespaces).isEmpty {
                    lines.append(line)
                }
                break
            }
        }

        return lines.joined(separator: "\n")
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

    /// Normalize text and build a mapping from each normalized character index
    /// to the corresponding index in the original string.
    /// indexMap[i] = the original string index that produced normalized character i.
    /// indexMap has count == normalized.count + 1 (last entry maps past-the-end).
    private func normalizeWithMapping(_ text: String) -> (String, [String.Index]) {
        var normalized = ""
        var indexMap: [String.Index] = []
        var prevWasSpace = false

        for index in text.indices {
            let char = text[index]

            if char.isWhitespace || char.isNewline {
                if !prevWasSpace && !normalized.isEmpty {
                    normalized.append(" ")
                    indexMap.append(index)
                    prevWasSpace = true
                }
            } else if char.isLetter || char.isNumber {
                for c in char.lowercased() {
                    normalized.append(c)
                    indexMap.append(index)
                }
                prevWasSpace = false
            }
            // punctuation: skip, no append
        }

        // Trim trailing space
        if normalized.hasSuffix(" ") {
            normalized.removeLast()
            indexMap.removeLast()
        }

        // Append past-the-end marker
        indexMap.append(text.endIndex)

        return (normalized, indexMap)
    }

    // MARK: - Cleanup

    func cancelAllTasks() {
        geniusDebounceTask?.cancel()
        artistDebounceTask?.cancel()
        songDebounceTask?.cancel()
        matchDebounceTask?.cancel()
        lyricsFetchTask?.cancel()
        prefetchTask?.cancel()
    }
}
