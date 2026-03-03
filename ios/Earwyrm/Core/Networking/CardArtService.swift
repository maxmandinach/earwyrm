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
        let isFreeTier: Bool?

        enum CodingKeys: String, CodingKey {
            case imageUrl = "image_url"
            case remaining
            case isFreeTier = "is_free_gen"
        }
    }

    private struct ErrorResponse: Decodable {
        let error: String?
        let upgrade: Bool?
    }

    struct GenerateResult {
        let url: URL
        let remaining: Int
        let isFreeTier: Bool
    }

    enum CardArtError: LocalizedError {
        case upgradeRequired

        var errorDescription: String? {
            switch self {
            case .upgradeRequired:
                return "You've used your free artwork"
            }
        }
    }

    /// Generate AI artwork for a lyric's share card.
    static func generateArt(lyric: Lyric, note: String?) async throws -> GenerateResult {
        let session = try await supabase.auth.session
        let accessToken = session.accessToken

        let body = CardArtRequest(
            lyricContent: lyric.content,
            noteContent: note,
            songTitle: lyric.songTitle,
            artistName: lyric.artistName,
            tags: lyric.tags,
            lyricId: lyric.id.uuidString
        )

        guard let url = URL(string: endpoint) else {
            throw HTTPError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            if let errorBody = try? JSONDecoder().decode(ErrorResponse.self, from: data),
               errorBody.upgrade == true {
                throw CardArtError.upgradeRequired
            }
            throw HTTPError.badStatus(http.statusCode)
        }

        let artResponse = try JSONDecoder().decode(CardArtResponse.self, from: data)

        guard let imageUrl = URL(string: artResponse.imageUrl) else {
            throw HTTPError.invalidURL
        }

        return GenerateResult(
            url: imageUrl,
            remaining: artResponse.remaining ?? 0,
            isFreeTier: artResponse.isFreeTier ?? false
        )
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
