import Foundation

struct PageStats {
    let lyricCount: Int
    let uniqueUsers: Int
    let totalResonances: Int
    let totalComments: Int
    let songCount: Int?

    static func from(lyrics: [Lyric], songCount: Int? = nil) -> PageStats {
        PageStats(
            lyricCount: lyrics.count,
            uniqueUsers: Set(lyrics.map(\.userId)).count,
            totalResonances: lyrics.reduce(0) { $0 + ($1.reactionCount ?? 0) },
            totalComments: lyrics.reduce(0) { $0 + ($1.commentCount ?? 0) },
            songCount: songCount
        )
    }
}
