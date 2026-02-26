import Foundation

struct LyricCluster: Identifiable {
    let id: UUID
    let group: [Lyric]
    let representative: Lyric
    let saveCount: Int
    let totalReactions: Int
    let totalComments: Int
    let mostRecent: Lyric

    var songTitle: String? { representative.songTitle }
    var artistName: String? { representative.artistName }
    var coverArtUrl: String? { representative.coverArtUrl }
}

enum LyricClusterer {

    /// Groups lyrics by `canonicalLyricId ?? id`, picking the highest-reaction lyric as representative.
    static func cluster(_ lyrics: [Lyric]) -> [LyricCluster] {
        var groups: [UUID: [Lyric]] = [:]

        for lyric in lyrics {
            let key = lyric.canonicalLyricId ?? lyric.id
            groups[key, default: []].append(lyric)
        }

        return groups.map { key, members in
            let representative = members.max(by: {
                ($0.reactionCount ?? 0) < ($1.reactionCount ?? 0)
            }) ?? members[0]

            let mostRecent = members.max(by: { $0.createdAt < $1.createdAt }) ?? members[0]

            return LyricCluster(
                id: key,
                group: members,
                representative: representative,
                saveCount: members.count,
                totalReactions: members.reduce(0) { $0 + ($1.reactionCount ?? 0) },
                totalComments: members.reduce(0) { $0 + ($1.commentCount ?? 0) },
                mostRecent: mostRecent
            )
        }
    }

    /// Returns top clusters sorted by saveCount desc, filtered to saveCount > 1.
    static func topSaved(_ clusters: [LyricCluster], limit: Int = 3) -> [LyricCluster] {
        clusters
            .filter { $0.saveCount > 1 }
            .sorted { $0.saveCount > $1.saveCount }
            .prefix(limit)
            .map { $0 }
    }
}
