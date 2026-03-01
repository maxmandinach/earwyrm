import Foundation

/// Fetch full lyrics via the song-lyrics edge function (cached in Supabase).
enum SongLyricsService {
    private static let supabaseUrl = "https://btrwdmeguitbbvcreokk.supabase.co"
    private static let endpoint = "\(supabaseUrl)/functions/v1/song-lyrics"
    private static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cndkbWVndWl0YmJ2Y3Jlb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTc1NjAsImV4cCI6MjA4MzM3MzU2MH0.4FpwGF-AqOnpJIVTGG1Er7F2262_Eff1FGk7PA8AY3Y"

    static func fetchLyrics(songTitle: String, artistName: String) async -> String? {
        let trimmedTitle = songTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedArtist = artistName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty, !trimmedArtist.isEmpty else { return nil }

        do {
            let response: SongLyricsResponse = try await HTTPClient.post(
                endpoint,
                body: SongLyricsRequest(songTitle: trimmedTitle, artistName: trimmedArtist),
                headers: ["Authorization": "Bearer \(anonKey)"]
            )
            return response.plainLyrics
        } catch {
            print("Song lyrics fetch error: \(error)")
            return nil
        }
    }
}

private struct SongLyricsRequest: Encodable {
    let songTitle: String
    let artistName: String

    enum CodingKeys: String, CodingKey {
        case songTitle = "song_title"
        case artistName = "artist_name"
    }
}

private struct SongLyricsResponse: Decodable {
    let plainLyrics: String?
    let source: String?
    let cached: Bool?

    enum CodingKeys: String, CodingKey {
        case plainLyrics = "plain_lyrics"
        case source
        case cached
    }
}
