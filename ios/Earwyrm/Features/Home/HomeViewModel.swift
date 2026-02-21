import Foundation
import Supabase

@Observable
final class HomeViewModel {
    var currentLyric: Lyric?
    var isLoading = false
    var error: String?

    private static let lyricColumns = """
        id, user_id, content, song_title, artist_name, cover_art_url, \
        album_name, is_current, is_public, tags, share_token, \
        canonical_lyric_id, musicbrainz_recording_id, musicbrainz_release_id, \
        reaction_count, comment_count, created_at, replaced_at
        """

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
}
