import Foundation

struct ContentReportInsert: Encodable {
    let reporterId: UUID
    let contentType: String
    let contentId: UUID
    let reason: String

    enum CodingKeys: String, CodingKey {
        case reporterId = "reporter_id"
        case contentType = "content_type"
        case contentId = "content_id"
        case reason
    }
}

struct UserBlockInsert: Encodable {
    let blockerId: UUID
    let blockedUserId: UUID

    enum CodingKeys: String, CodingKey {
        case blockerId = "blocker_id"
        case blockedUserId = "blocked_user_id"
    }
}

struct UserBlock: Codable, Identifiable {
    let id: UUID
    let blockerId: UUID
    let blockedUserId: UUID
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case blockerId = "blocker_id"
        case blockedUserId = "blocked_user_id"
        case createdAt = "created_at"
    }
}
