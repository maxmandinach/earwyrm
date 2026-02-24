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
    let subscriptionTier: String?
    let subscriptionExpiresAt: Date?

    var isPlus: Bool { subscriptionTier == "plus" }

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
        case subscriptionTier = "subscription_tier"
        case subscriptionExpiresAt = "subscription_expires_at"
    }
}
