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

    // MARK: - Cleanup

    func cancelAllTasks() {
        geniusDebounceTask?.cancel()
        artistDebounceTask?.cancel()
        songDebounceTask?.cancel()
        matchDebounceTask?.cancel()
    }
}
