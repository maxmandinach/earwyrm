import Foundation

struct LyricCollection: Codable, Identifiable {
    let id: UUID
    let lyricId: UUID
    let collectionId: UUID
    let addedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case lyricId = "lyric_id"
        case collectionId = "collection_id"
        case addedAt = "added_at"
    }
}

struct LyricCollectionInsert: Encodable {
    let lyricId: UUID
    let collectionId: UUID

    enum CodingKeys: String, CodingKey {
        case lyricId = "lyric_id"
        case collectionId = "collection_id"
    }
}
