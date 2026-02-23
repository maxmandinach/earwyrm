import Foundation

struct Profile: Codable, Identifiable {
    let id: UUID
    let username: String
    let displayName: String?
    let bio: String?
    let avatarUrl: String?
    let isPublic: Bool?
    let lastActivitySeenAt: Date?
    let createdAt: Date?
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case username
        case displayName = "display_name"
        case bio
        case avatarUrl = "avatar_url"
        case isPublic = "is_public"
        case lastActivitySeenAt = "last_activity_seen_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
