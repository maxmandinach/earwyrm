import Foundation

/// Read model for comments. Profile data is joined separately.
struct Comment: Codable, Identifiable {
    let id: UUID
    let lyricId: UUID
    let userId: UUID
    let content: String
    let parentCommentId: UUID?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case lyricId = "lyric_id"
        case userId = "user_id"
        case content
        case parentCommentId = "parent_comment_id"
        case createdAt = "created_at"
    }
}

/// Comment with joined profile username for display.
struct CommentWithProfile: Identifiable {
    let comment: Comment
    let username: String?
    let isPlus: Bool

    init(comment: Comment, username: String?, isPlus: Bool = false) {
        self.comment = comment
        self.username = username
        self.isPlus = isPlus
    }

    var id: UUID { comment.id }
    var content: String { comment.content }
    var userId: UUID { comment.userId }
    var parentCommentId: UUID? { comment.parentCommentId }
    var createdAt: Date { comment.createdAt }
}

/// Encodable struct for INSERT into comments table.
struct CommentInsert: Encodable {
    let lyricId: UUID
    let userId: UUID
    let content: String
    let parentCommentId: UUID?

    enum CodingKeys: String, CodingKey {
        case lyricId = "lyric_id"
        case userId = "user_id"
        case content
        case parentCommentId = "parent_comment_id"
    }
}

/// Minimal profile for comment display joins.
struct CommentProfile: Codable, Identifiable {
    let id: UUID
    let username: String
    let subscriptionTier: String?

    var isPlus: Bool { subscriptionTier == "plus" }

    enum CodingKeys: String, CodingKey {
        case id
        case username
        case subscriptionTier = "subscription_tier"
    }
}
