import Foundation
import Supabase

// MARK: - Wrapper Types

struct LyricWithProfile: Identifiable, Hashable {
    let lyric: Lyric
    let username: String?
    let isPlus: Bool

    init(lyric: Lyric, username: String?, isPlus: Bool = false) {
        self.lyric = lyric
        self.username = username
        self.isPlus = isPlus
    }

    var id: UUID { lyric.id }

    static func == (lhs: LyricWithProfile, rhs: LyricWithProfile) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

private struct ProfileWithTier: Codable, Identifiable {
    let id: UUID
    let username: String
    let subscriptionTier: String?

    enum CodingKeys: String, CodingKey {
        case id, username
        case subscriptionTier = "subscription_tier"
    }
}

private struct NoteUpsert: Encodable {
    let lyricId: UUID
    let userId: UUID
    let content: String
    let isPublic: Bool

    enum CodingKeys: String, CodingKey {
        case lyricId = "lyric_id"
        case userId = "user_id"
        case content
        case isPublic = "is_public"
    }
}

// MARK: - ViewModel

@Observable
final class HomeViewModel {
    var currentLyric: Lyric?
    var isLoading = false
    var error: String?

    // Section state
    var pastLyrics: [Lyric] = []
    var currentNote: LyricNote?

    static let lyricColumns = """
        id, user_id, content, song_title, artist_name, cover_art_url, \
        album_name, is_current, is_public, tags, share_token, \
        canonical_lyric_id, musicbrainz_recording_id, musicbrainz_release_id, \
        reaction_count, comment_count, card_art_url, created_at, replaced_at
        """

    // MARK: - Current Lyric

    func fetchCurrentLyric(userId: UUID) async {
        isLoading = true
        error = nil
        do {
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .eq("user_id", value: userId.uuidString)
                .eq("is_current", value: true)
                .limit(1)
                .execute()
                .value

            await MainActor.run {
                self.currentLyric = lyrics.first
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func toggleVisibility(lyricId: UUID, isPublic: Bool) async {
        // Optimistic update
        await MainActor.run {
            // Swift structs are immutable, so we need to create a new Lyric
            // For now, just refresh after the DB call
        }

        do {
            let update = LyricVisibilityUpdate(isPublic: isPublic)
            try await supabase
                .from("lyrics")
                .update(update)
                .eq("id", value: lyricId.uuidString)
                .execute()

            // Refresh to pick up the change
            if let userId = currentLyric?.userId {
                await refreshCurrentLyric(userId: userId)
            }
        } catch {
            print("Toggle visibility error: \(error)")
        }
    }

    func refreshCurrentLyric(userId: UUID) async {
        do {
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .eq("user_id", value: userId.uuidString)
                .eq("is_current", value: true)
                .limit(1)
                .execute()
                .value

            await MainActor.run {
                self.currentLyric = lyrics.first
            }
        } catch {
            print("Refresh current lyric error: \(error)")
        }
    }

    // MARK: - Memory Lane

    func fetchPastLyrics(userId: UUID) async {
        do {
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .eq("user_id", value: userId.uuidString)
                .eq("is_current", value: false)
                .order("created_at", ascending: false)
                .limit(50)
                .execute()
                .value

            print("Past lyrics fetched: \(lyrics.count)")
            await MainActor.run {
                self.pastLyrics = lyrics
            }
        } catch {
            print("Fetch past lyrics error: \(error)")
        }
    }

    // MARK: - Notes

    func fetchNote(lyricId: UUID, userId: UUID) async {
        do {
            let notes: [LyricNote] = try await supabase
                .from("lyric_notes")
                .select("id, lyric_id, user_id, content, is_public, created_at, updated_at")
                .eq("lyric_id", value: lyricId.uuidString)
                .eq("user_id", value: userId.uuidString)
                .limit(1)
                .execute()
                .value

            print("Note fetched: \(notes.first?.content ?? "none")")
            await MainActor.run {
                self.currentNote = notes.first
            }
        } catch {
            print("Fetch note error: \(error)")
        }
    }

    func saveNote(lyricId: UUID, userId: UUID, content: String, isPublic: Bool) async {
        let trimmed = String(content.prefix(500))
        guard !trimmed.isEmpty else { return }

        do {
            if let existing = currentNote {
                // Update existing note
                struct NoteContentUpdate: Encodable {
                    let content: String
                    let isPublic: Bool
                    enum CodingKeys: String, CodingKey {
                        case content
                        case isPublic = "is_public"
                    }
                }

                let update = NoteContentUpdate(content: trimmed, isPublic: isPublic)
                try await supabase
                    .from("lyric_notes")
                    .update(update)
                    .eq("id", value: existing.id.uuidString)
                    .execute()
            } else {
                // Insert new note
                let insert = NoteUpsert(
                    lyricId: lyricId,
                    userId: userId,
                    content: trimmed,
                    isPublic: isPublic
                )
                let created: [LyricNote] = try await supabase
                    .from("lyric_notes")
                    .insert(insert)
                    .select("id, lyric_id, user_id, content, is_public, created_at, updated_at")
                    .execute()
                    .value

                await MainActor.run {
                    self.currentNote = created.first
                }
            }
        } catch {
            print("Save note error: \(error)")
        }
    }

    // MARK: - Load All Sections

    func loadAllSections(userId: UUID) async {
        await fetchPastLyrics(userId: userId)
    }

    // MARK: - Duration Formatting

    static func formatDuration(from start: Date, to end: Date) -> String {
        let interval = end.timeIntervalSince(start)
        let days = Int(interval / 86400)

        if days < 1 { return "today" }
        if days == 1 { return "1 day" }
        if days < 7 { return "\(days) days" }

        let weeks = days / 7
        if weeks == 1 { return "1 week" }
        if weeks < 5 { return "\(weeks) weeks" }

        let months = days / 30
        if months == 1 { return "1 month" }
        if months < 12 { return "\(months) months" }

        let years = days / 365
        if years == 1 { return "1 year" }
        return "\(years) years"
    }
}
