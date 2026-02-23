import Foundation

/// Fetch full lyrics from LRCLIB (free, no auth required).
enum LRCLIBService {
    private static let baseURL = "https://lrclib.net/api/get"

    /// Fetch plain lyrics for a given artist and track title.
    /// Returns `nil` on any error (404, network, decode).
    static func fetchLyrics(artist: String, title: String) async -> String? {
        let trimmedArtist = artist.trimmingCharacters(in: .whitespaces)
        let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
        guard !trimmedArtist.isEmpty, !trimmedTitle.isEmpty else { return nil }

        var components = URLComponents(string: baseURL)
        components?.queryItems = [
            URLQueryItem(name: "artist_name", value: trimmedArtist),
            URLQueryItem(name: "track_name", value: trimmedTitle),
        ]

        guard let urlString = components?.url?.absoluteString else { return nil }

        do {
            let response: LRCLIBResponse = try await HTTPClient.get(urlString)
            return response.plainLyrics
        } catch {
            return nil
        }
    }
}

private struct LRCLIBResponse: Decodable {
    let plainLyrics: String?
    let syncedLyrics: String?
}
