import Foundation
import Supabase

// MARK: - Filter Types

enum TimeRange: String, CaseIterable {
    case all = "all time"
    case week = "this week"
    case today = "today"

    var cutoffDate: Date? {
        switch self {
        case .all: return nil
        case .week: return Calendar.current.date(byAdding: .day, value: -7, to: Date())
        case .today: return Calendar.current.date(byAdding: .day, value: -1, to: Date())
        }
    }
}

enum SortOption: String, CaseIterable {
    case newest = "Newest"
    case resonated = "Most resonated"
    case discussed = "Most discussed"
}

// MARK: - Trending Tag

struct TrendingTag: Identifiable {
    let tag: String
    let count: Int
    var id: String { tag }
}

// MARK: - ViewModel

@Observable
@MainActor
final class ExploreViewModel {
    var allLyrics: [Lyric] = []
    var profileMap: [UUID: String] = [:]
    var trendingTags: [TrendingTag] = []
    var isLoading = false
    var error: String?

    private static let lyricColumns = """
        id, user_id, content, song_title, artist_name, cover_art_url, \
        album_name, is_current, is_public, tags, share_token, \
        canonical_lyric_id, musicbrainz_recording_id, musicbrainz_release_id, \
        reaction_count, comment_count, created_at, replaced_at
        """

    // MARK: - Fetching

    func fetchPublicLyrics() async {
        isLoading = true
        error = nil
        do {
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .eq("is_public", value: true)
                .order("created_at", ascending: false)
                .limit(80)
                .execute()
                .value
            allLyrics = lyrics

            // Batch-fetch profiles for usernames
            let userIds = Array(Set(lyrics.map(\.userId)))
            if !userIds.isEmpty {
                let profiles: [CommentProfile] = try await supabase
                    .from("profiles")
                    .select("id, username")
                    .in("id", values: userIds.map(\.uuidString))
                    .execute()
                    .value
                for p in profiles {
                    profileMap[p.id] = p.username
                }
            }
        } catch {
            self.error = error.localizedDescription
            print("Fetch public lyrics error: \(error)")
        }
        isLoading = false
    }

    func fetchTrendingTags() async {
        do {
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select("id, tags, created_at")
                .eq("is_public", value: true)
                .order("created_at", ascending: false)
                .limit(200)
                .execute()
                .value

            var tagCounts: [String: Int] = [:]
            for lyric in lyrics {
                for tag in lyric.tags ?? [] {
                    tagCounts[tag, default: 0] += 1
                }
            }

            trendingTags = tagCounts
                .sorted { $0.value > $1.value }
                .prefix(10)
                .map { TrendingTag(tag: $0.key, count: $0.value) }
        } catch {
            print("Fetch trending tags error: \(error)")
        }
    }

    // MARK: - ForYou Pipeline

    func forYouFeed(
        follows: [Follow],
        userId: UUID?,
        selectedTags: Set<String>,
        timeRange: TimeRange,
        search: String,
        sort: SortOption,
        limit: Int
    ) -> [Lyric] {
        var lyrics = allLyrics

        // Exclude own lyrics
        if let userId {
            lyrics = lyrics.filter { $0.userId != userId }
        }

        // Exclude followed content (ForYou = discovery)
        if !follows.isEmpty {
            let followedArtists = Set(
                follows.filter { $0.filterType == "artist" }
                    .map { $0.filterValue.lowercased() }
            )
            let followedSongs = Set(
                follows.filter { $0.filterType == "song" }
                    .map { $0.filterValue.lowercased() }
            )
            let followedTags = Set(
                follows.filter { $0.filterType == "tag" }
                    .map { $0.filterValue.lowercased() }
            )

            lyrics = lyrics.filter { lyric in
                if lyric.artistName.map({ followedArtists.contains($0.lowercased()) }) ?? false {
                    return false
                }
                if lyric.songTitle.map({ followedSongs.contains($0.lowercased()) }) ?? false {
                    return false
                }
                if lyric.tags?.contains(where: { followedTags.contains($0.lowercased()) }) ?? false {
                    return false
                }
                return true
            }
        }

        // Tag filter
        if !selectedTags.isEmpty {
            lyrics = lyrics.filter { lyric in
                guard let tags = lyric.tags else { return false }
                return tags.contains(where: { selectedTags.contains($0) })
            }
        }

        // Time range
        if let cutoff = timeRange.cutoffDate {
            lyrics = lyrics.filter { $0.createdAt >= cutoff }
        }

        // Search
        lyrics = applySearch(lyrics, query: search)

        // Sort
        lyrics = applySort(lyrics, sort: sort)

        return Array(lyrics.prefix(limit))
    }

    // MARK: - Following Pipeline

    func followingFeed(
        follows: [Follow],
        activeFollowIds: Set<UUID>,
        timeRange: TimeRange,
        search: String,
        sort: SortOption,
        limit: Int,
        userId: UUID?
    ) -> [Lyric] {
        var lyrics = allLyrics

        // Exclude own
        if let userId {
            lyrics = lyrics.filter { $0.userId != userId }
        }

        // Match against follows (all if none active, otherwise only active)
        let followsToMatch = activeFollowIds.isEmpty
            ? follows
            : follows.filter { activeFollowIds.contains($0.id) }

        lyrics = lyrics.filter { lyric in
            matchesAnyFollow(lyric: lyric, follows: followsToMatch)
        }

        // Time range
        if let cutoff = timeRange.cutoffDate {
            lyrics = lyrics.filter { $0.createdAt >= cutoff }
        }

        // Search
        lyrics = applySearch(lyrics, query: search)

        // Sort
        lyrics = applySort(lyrics, sort: sort)

        return Array(lyrics.prefix(limit))
    }

    // MARK: - Helpers

    private func matchesAnyFollow(lyric: Lyric, follows: [Follow]) -> Bool {
        for follow in follows {
            switch follow.filterType {
            case "artist":
                if let artist = lyric.artistName,
                   artist.caseInsensitiveCompare(follow.filterValue) == .orderedSame {
                    return true
                }
            case "song":
                if let song = lyric.songTitle,
                   song.caseInsensitiveCompare(follow.filterValue) == .orderedSame {
                    return true
                }
            case "tag":
                if let tags = lyric.tags,
                   tags.contains(where: { $0.caseInsensitiveCompare(follow.filterValue) == .orderedSame }) {
                    return true
                }
            default:
                break
            }
        }
        return false
    }

    private func applySearch(_ lyrics: [Lyric], query: String) -> [Lyric] {
        guard !query.isEmpty else { return lyrics }
        let q = query.lowercased()
        return lyrics.filter { lyric in
            lyric.content.lowercased().contains(q)
            || (lyric.artistName?.lowercased().contains(q) ?? false)
            || (lyric.songTitle?.lowercased().contains(q) ?? false)
            || (lyric.tags?.contains(where: { $0.lowercased().contains(q) }) ?? false)
        }
    }

    private func applySort(_ lyrics: [Lyric], sort: SortOption) -> [Lyric] {
        switch sort {
        case .newest:
            return lyrics.sorted { $0.createdAt > $1.createdAt }
        case .resonated:
            return lyrics.sorted { ($0.reactionCount ?? 0) > ($1.reactionCount ?? 0) }
        case .discussed:
            return lyrics.sorted { ($0.commentCount ?? 0) > ($1.commentCount ?? 0) }
        }
    }
}
