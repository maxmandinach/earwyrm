import Foundation

struct Reaction: Codable, Identifiable {
    let id: UUID
    let lyricId: UUID
    let userId: UUID
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case lyricId = "lyric_id"
        case userId = "user_id"
        case createdAt = "created_at"
    }
}

/// Encodable struct for INSERT into reactions table.
struct ReactionInsert: Encodable {
    let lyricId: UUID
    let userId: UUID

    enum CodingKeys: String, CodingKey {
        case lyricId = "lyric_id"
        case userId = "user_id"
    }
}
