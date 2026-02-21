import Foundation

// MARK: - Artist Search

struct MBArtistSearchResponse: Decodable {
    let artists: [MBArtist]?
}

struct MBArtist: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let type: String?
    let country: String?
    let disambiguation: String?
    let score: Int?
}

// MARK: - Recording Search

struct MBRecordingSearchResponse: Decodable {
    let recordings: [MBRecording]?
}

struct MBRecording: Decodable, Identifiable {
    let id: String
    let title: String
    let score: Int?
    let disambiguation: String?
    let artistCredit: [MBArtistCredit]?
    let releases: [MBRelease]?

    enum CodingKeys: String, CodingKey {
        case id, title, score, disambiguation, releases
        case artistCredit = "artist-credit"
    }

    var artistName: String? {
        artistCredit?.first?.name
    }
}

struct MBArtistCredit: Decodable {
    let name: String
}

struct MBRelease: Decodable {
    let id: String
    let title: String?
    let date: String?
    let releaseGroup: MBReleaseGroup?
    let secondaryTypes: [String]?

    enum CodingKeys: String, CodingKey {
        case id, title, date
        case releaseGroup = "release-group"
        case secondaryTypes = "secondary-types"
    }

    var year: String? {
        guard let date, date.count >= 4 else { return nil }
        return String(date.prefix(4))
    }
}

struct MBReleaseGroup: Decodable {
    let id: String
    let primaryType: String?
    let secondaryTypes: [String]?

    enum CodingKeys: String, CodingKey {
        case id
        case primaryType = "primary-type"
        case secondaryTypes = "secondary-types"
    }
}

// MARK: - Cover Art Archive

struct CoverArtResponse: Decodable {
    let images: [CoverArtImage]?
}

struct CoverArtImage: Decodable {
    let front: Bool?
    let thumbnails: CoverArtThumbnails?
}

struct CoverArtThumbnails: Decodable {
    let small: String?
    let the250: String?

    enum CodingKeys: String, CodingKey {
        case small
        case the250 = "250"
    }

    var bestUrl: String? {
        let url = the250 ?? small
        return url?.replacingOccurrences(of: "http://", with: "https://")
    }
}

// MARK: - Mapped Recording (clean output format)

struct MappedRecording: Identifiable, Hashable {
    let id: String
    let title: String
    let artist: String?
    let album: String?
    let releaseId: String?
    let releaseGroupId: String?
    let year: String?
    let score: Int

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: MappedRecording, rhs: MappedRecording) -> Bool {
        lhs.id == rhs.id
    }
}
