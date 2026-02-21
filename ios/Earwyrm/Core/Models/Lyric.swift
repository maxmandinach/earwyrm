import Foundation

struct Lyric: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let content: String
    let songTitle: String?
    let artistName: String?
    let coverArtUrl: String?
    let albumName: String?
    let isCurrent: Bool?
    let isPublic: Bool?
    let tags: [String]?
    let shareToken: String?
    let canonicalLyricId: UUID?
    let musicbrainzRecordingId: String?
    let musicbrainzReleaseId: String?
    let reactionCount: Int?
    let commentCount: Int?
    let createdAt: Date
    let replacedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case content
        case songTitle = "song_title"
        case artistName = "artist_name"
        case coverArtUrl = "cover_art_url"
        case albumName = "album_name"
        case isCurrent = "is_current"
        case isPublic = "is_public"
        case tags
        case shareToken = "share_token"
        case canonicalLyricId = "canonical_lyric_id"
        case musicbrainzRecordingId = "musicbrainz_recording_id"
        case musicbrainzReleaseId = "musicbrainz_release_id"
        case reactionCount = "reaction_count"
        case commentCount = "comment_count"
        case createdAt = "created_at"
        case replacedAt = "replaced_at"
    }
}
