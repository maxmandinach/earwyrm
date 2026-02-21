import Foundation

struct Follow: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let filterType: String
    let filterValue: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case filterType = "filter_type"
        case filterValue = "filter_value"
        case createdAt = "created_at"
    }
}

struct FollowInsert: Encodable {
    let userId: UUID
    let filterType: String
    let filterValue: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case filterType = "filter_type"
        case filterValue = "filter_value"
    }
}
