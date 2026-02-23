import Foundation
import Supabase

// MARK: - Wrapper Types

struct NoteWithLyric: Identifiable {
    let note: LyricNote
    let lyric: Lyric?

    var id: UUID { note.id }
}

struct ResonatedLyric: Identifiable {
    let lyric: Lyric
    let username: String?
    let resonatedAt: Date

    var id: UUID { lyric.id }
}

// MARK: - ViewModel

@Observable
@MainActor
final class ProfileViewModel {
    var allLyrics: [Lyric] = []
    var resonatedLyrics: [ResonatedLyric] = []
    var notes: [NoteWithLyric] = []
    var isLoading = false
    var error: String?

    private static let lyricColumns = """
        id, user_id, content, song_title, artist_name, cover_art_url, \
        album_name, is_current, is_public, tags, share_token, \
        canonical_lyric_id, musicbrainz_recording_id, musicbrainz_release_id, \
        reaction_count, comment_count, created_at, replaced_at
        """

    // MARK: - All Lyrics

    func fetchAllLyrics(userId: UUID) async {
        isLoading = true
        error = nil
        do {
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .eq("user_id", value: userId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value

            self.allLyrics = lyrics
        } catch {
            self.error = error.localizedDescription
            print("Fetch all lyrics error: \(error)")
        }
        isLoading = false
    }

    // MARK: - Resonated Lyrics

    func fetchResonatedLyrics(userId: UUID) async {
        do {
            let reactions: [Reaction] = try await supabase
                .from("reactions")
                .select("id, lyric_id, user_id, created_at")
                .eq("user_id", value: userId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value

            guard !reactions.isEmpty else {
                self.resonatedLyrics = []
                return
            }

            let lyricIds = reactions.map(\.lyricId)
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .in("id", values: lyricIds.map(\.uuidString))
                .execute()
                .value

            // Batch-fetch profiles
            let userIds = Array(Set(lyrics.map(\.userId)))
            var profileMap: [UUID: String] = [:]

            if !userIds.isEmpty {
                let profiles: [CommentProfile] = try await supabase
                    .from("profiles")
                    .select("id, username")
                    .in("id", values: userIds.map(\.uuidString))
                    .execute()
                    .value

                for p in profiles {
                    profileMap[p.id] = p.username
                }
            }

            // Map lyrics by ID for lookup
            let lyricMap = Dictionary(uniqueKeysWithValues: lyrics.map { ($0.id, $0) })

            // Build resonated list in reaction order
            let mapped: [ResonatedLyric] = reactions.compactMap { reaction in
                guard let lyric = lyricMap[reaction.lyricId] else { return nil }
                return ResonatedLyric(
                    lyric: lyric,
                    username: profileMap[lyric.userId],
                    resonatedAt: reaction.createdAt
                )
            }

            self.resonatedLyrics = mapped
        } catch {
            print("Fetch resonated lyrics error: \(error)")
        }
    }

    // MARK: - Notes

    func fetchNotes(userId: UUID) async {
        do {
            let notes: [LyricNote] = try await supabase
                .from("lyric_notes")
                .select("id, lyric_id, user_id, content, is_public, created_at, updated_at")
                .eq("user_id", value: userId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value

            guard !notes.isEmpty else {
                self.notes = []
                return
            }

            // Fetch associated lyrics
            let lyricIds = Array(Set(notes.map(\.lyricId)))
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .in("id", values: lyricIds.map(\.uuidString))
                .execute()
                .value

            let lyricMap = Dictionary(uniqueKeysWithValues: lyrics.map { ($0.id, $0) })

            let mapped = notes.map { note in
                NoteWithLyric(note: note, lyric: lyricMap[note.lyricId])
            }

            self.notes = mapped
        } catch {
            print("Fetch notes error: \(error)")
        }
    }

    // MARK: - Load All

    func loadAll(userId: UUID) async {
        isLoading = true
        error = nil
        async let lyrics: () = fetchAllLyrics(userId: userId)
        async let resonated: () = fetchResonatedLyrics(userId: userId)
        async let notesData: () = fetchNotes(userId: userId)
        _ = await (lyrics, resonated, notesData)
        isLoading = false
    }
}
