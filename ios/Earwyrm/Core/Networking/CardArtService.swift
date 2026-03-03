import Foundation
import UIKit
import Supabase

/// Generates AI artwork for share cards via the generate-card-art Edge Function.
enum CardArtService {
    private static let supabaseUrl = "https://btrwdmeguitbbvcreokk.supabase.co"
    private static let endpoint = "\(supabaseUrl)/functions/v1/generate-card-art"

    struct CardArtRequest: Encodable {
        let lyricContent: String
        let noteContent: String?
        let songTitle: String?
        let artistName: String?
        let tags: [String]?
        let lyricId: String

        enum CodingKeys: String, CodingKey {
            case lyricContent = "lyric_content"
            case noteContent = "note_content"
            case songTitle = "song_title"
            case artistName = "artist_name"
            case tags
            case lyricId = "lyric_id"
        }
    }

    struct CardArtResponse: Decodable {
        let imageUrl: String
        let remaining: Int?

        enum CodingKeys: String, CodingKey {
            case imageUrl = "image_url"
            case remaining
        }
    }

    struct GenerateResult {
        let url: URL
        let remaining: Int
    }

    /// Generate AI artwork for a lyric's share card. Requires Plus subscription.
    static func generateArt(lyric: Lyric, note: String?) async throws -> GenerateResult {
        // Get the user's access token for authenticated request
        let session = try await supabase.auth.session
        let accessToken = session.accessToken

        let request = CardArtRequest(
            lyricContent: lyric.content,
            noteContent: note,
            songTitle: lyric.songTitle,
            artistName: lyric.artistName,
            tags: lyric.tags,
            lyricId: lyric.id.uuidString
        )

        let response: CardArtResponse = try await HTTPClient.post(
            endpoint,
            body: request,
            headers: [
                "Authorization": "Bearer \(accessToken)"
            ]
        )

        guard let url = URL(string: response.imageUrl) else {
            throw HTTPError.invalidURL
        }

        return GenerateResult(url: url, remaining: response.remaining ?? 0)
    }

    /// Download an image from a URL, returning a UIImage.
    static func downloadImage(from url: URL) async -> UIImage? {
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            return UIImage(data: data)
        } catch {
            print("Failed to download AI art: \(error)")
            return nil
        }
    }
}
