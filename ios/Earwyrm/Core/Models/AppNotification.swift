import Foundation

struct AppNotification: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let type: String
    let lyricId: UUID?
    let commentId: UUID?
    let collectionId: UUID?
    let actorId: UUID?
    let lyricSnippet: String?
    let songTitle: String?
    let artistName: String?
    let shareToken: String?
    let actorUsername: String?
    let commentContent: String?
    let collectionName: String?
    let followType: String?
    let followValue: String?
    let readAt: Date?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case type
        case lyricId = "lyric_id"
        case commentId = "comment_id"
        case collectionId = "collection_id"
        case actorId = "actor_id"
        case lyricSnippet = "lyric_snippet"
        case songTitle = "song_title"
        case artistName = "artist_name"
        case shareToken = "share_token"
        case actorUsername = "actor_username"
        case commentContent = "comment_content"
        case collectionName = "collection_name"
        case followType = "follow_type"
        case followValue = "follow_value"
        case readAt = "read_at"
        case createdAt = "created_at"
    }
}

/// Encodable struct for app-side share notification INSERT.
struct ShareNotificationInsert: Encodable {
    let userId: UUID
    let type: String
    let lyricId: UUID
    let actorId: UUID
    let lyricSnippet: String?
    let songTitle: String?
    let artistName: String?
    let shareToken: String?
    let actorUsername: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case type
        case lyricId = "lyric_id"
        case actorId = "actor_id"
        case lyricSnippet = "lyric_snippet"
        case songTitle = "song_title"
        case artistName = "artist_name"
        case shareToken = "share_token"
        case actorUsername = "actor_username"
    }
}
