import Foundation

/// Encodable struct for INSERT payload to lyrics table.
/// Separate from Lyric because insert shape differs (no id, counts, timestamps).
struct LyricInsert: Encodable {
    let userId: UUID
    let content: String
    let songTitle: String?
    let artistName: String?
    let coverArtUrl: String?
    let cardArtUrl: String?
    let albumName: String?
    let tags: [String]?
    let isPublic: Bool
    let isCurrent: Bool
    let canonicalLyricId: UUID?
    let musicbrainzRecordingId: String?
    let musicbrainzReleaseId: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case content
        case songTitle = "song_title"
        case artistName = "artist_name"
        case coverArtUrl = "cover_art_url"
        case cardArtUrl = "card_art_url"
        case albumName = "album_name"
        case tags
        case isPublic = "is_public"
        case isCurrent = "is_current"
        case canonicalLyricId = "canonical_lyric_id"
        case musicbrainzRecordingId = "musicbrainz_recording_id"
        case musicbrainzReleaseId = "musicbrainz_release_id"
    }
}

/// Encodable struct for toggling lyric visibility.
struct LyricVisibilityUpdate: Encodable {
    let isPublic: Bool

    enum CodingKeys: String, CodingKey {
        case isPublic = "is_public"
    }
}

/// Encodable struct for archiving the current lyric (set is_current=false, replaced_at=now).
struct LyricArchiveUpdate: Encodable {
    let isCurrent: Bool
    let replacedAt: String

    enum CodingKeys: String, CodingKey {
        case isCurrent = "is_current"
        case replacedAt = "replaced_at"
    }
}
