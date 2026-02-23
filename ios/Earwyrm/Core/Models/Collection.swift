import Foundation

struct Collection: Codable, Identifiable, Hashable {
    let id: UUID
    let userId: UUID
    let name: String
    let description: String?
    let color: String?
    let isSmart: Bool?
    let smartTag: String?
    let createdAt: Date
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case description
        case color
        case isSmart = "is_smart"
        case smartTag = "smart_tag"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CollectionInsert: Encodable {
    let userId: UUID
    let name: String
    let description: String?
    let color: String?
    let isSmart: Bool
    let smartTag: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case name
        case description
        case color
        case isSmart = "is_smart"
        case smartTag = "smart_tag"
    }
}
