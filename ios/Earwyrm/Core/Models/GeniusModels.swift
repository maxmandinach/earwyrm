import Foundation

struct GeniusSearchRequest: Encodable {
    let lyrics: String
}

struct GeniusSearchResponse: Decodable {
    let results: [GeniusSuggestion]?
}

struct GeniusSuggestion: Decodable, Identifiable, Hashable {
    let title: String
    let artist: String?
    let albumArt: String?
    let artistImageUrl: String?
    let geniusUrl: String?

    var id: String { "\(title)::\(artist ?? "")" }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: GeniusSuggestion, rhs: GeniusSuggestion) -> Bool {
        lhs.id == rhs.id
    }
}
