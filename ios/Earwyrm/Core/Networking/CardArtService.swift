import Foundation
import UIKit
import Supabase

/// Generates AI artwork for share cards via the generate-card-art Edge Function.
enum CardArtService {
    struct CardArtRequest: Encodable {
        let lyricContent: String
        let noteContent: String?
        let songTitle: String?
        let artistName: String?
        let tags: [String]?
        let lyricId: String
        let refinement: String?

        enum CodingKeys: String, CodingKey {
            case lyricContent = "lyric_content"
            case noteContent = "note_content"
            case songTitle = "song_title"
            case artistName = "artist_name"
            case tags
            case lyricId = "lyric_id"
            case refinement
        }
    }

    struct Variant: Identifiable {
        let id: UUID
        let imageUrl: String
        let createdAt: Date
    }

    private struct VariantRow: Decodable {
        let id: UUID
        let imageUrl: String
        let createdAt: Date

        enum CodingKeys: String, CodingKey {
            case id
            case imageUrl = "image_url"
            case createdAt = "created_at"
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
    static func generateArt(lyric: Lyric, note: String?, refinement: String? = nil) async throws -> GenerateResult {
        let body = CardArtRequest(
            lyricContent: lyric.content,
            noteContent: note,
            songTitle: lyric.songTitle,
            artistName: lyric.artistName,
            tags: lyric.tags,
            lyricId: lyric.id.uuidString,
            refinement: refinement
        )

        do {
            let response: CardArtResponse = try await supabase.functions.invoke(
                "generate-card-art",
                options: .init(method: .post, body: body)
            )

            guard let imageUrl = URL(string: response.imageUrl) else {
                throw HTTPError.invalidURL
            }

            return GenerateResult(
                url: imageUrl,
                remaining: response.remaining ?? 0,
                isFreeTier: response.isFreeTier ?? false
            )
        } catch let error as FunctionsError {
            switch error {
            case .httpError(let code, let data):
                let errorBody = try? JSONDecoder().decode(ErrorResponse.self, from: data)
                if errorBody?.upgrade == true {
                    throw CardArtError.upgradeRequired
                }
                let bodyStr = String(data: data, encoding: .utf8) ?? "nil"
                NSLog("CardArtService: HTTP %d, body: %@", code, bodyStr)
                throw NSError(domain: "CardArtService", code: code, userInfo: [NSLocalizedDescriptionKey: errorBody?.error ?? "Generation failed (HTTP \(code))"])
            case .relayError:
                throw NSError(domain: "CardArtService", code: 502, userInfo: [NSLocalizedDescriptionKey: "Relay error invoking edge function"])
            }
        }
    }

    /// Fetch all art variants for a lyric, most recent first.
    static func fetchVariants(lyricId: UUID) async -> [Variant] {
        do {
            let rows: [VariantRow] = try await supabase
                .from("card_art_generations")
                .select("id, image_url, created_at")
                .eq("lyric_id", value: lyricId.uuidString)
                .not("image_url", operator: .is, value: "null")
                .order("created_at", ascending: false)
                .execute()
                .value

            return rows.map { Variant(id: $0.id, imageUrl: $0.imageUrl, createdAt: $0.createdAt) }
        } catch {
            print("Failed to fetch art variants: \(error)")
            return []
        }
    }

    /// Set a specific variant as the active card art for a lyric.
    static func setActiveVariant(lyricId: UUID, imageUrl: String) async {
        do {
            try await supabase
                .from("lyrics")
                .update(["card_art_url": imageUrl])
                .eq("id", value: lyricId.uuidString)
                .execute()
        } catch {
            print("Failed to set active variant: \(error)")
        }
    }

    private struct ClearCardArt: Encodable {
        let cardArtUrl: String? = nil
        enum CodingKeys: String, CodingKey {
            case cardArtUrl = "card_art_url"
        }
    }

    /// Clear the active card art for a lyric (set to NULL).
    static func clearActiveVariant(lyricId: UUID) async {
        do {
            try await supabase
                .from("lyrics")
                .update(ClearCardArt())
                .eq("id", value: lyricId.uuidString)
                .execute()
        } catch {
            print("Failed to clear active variant: \(error)")
        }
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
