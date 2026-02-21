import Foundation

struct LyricNote: Codable, Identifiable {
    let id: UUID
    let lyricId: UUID
    let userId: UUID
    let content: String
    let isPublic: Bool?
    let createdAt: Date
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case lyricId = "lyric_id"
        case userId = "user_id"
        case content
        case isPublic = "is_public"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct NoteInsert: Encodable {
    let lyricId: UUID
    let content: String
    let isPublic: Bool

    enum CodingKeys: String, CodingKey {
        case lyricId = "lyric_id"
        case content
        case isPublic = "is_public"
    }
}
