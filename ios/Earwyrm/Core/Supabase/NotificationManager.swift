import Foundation
import Supabase

@Observable
@MainActor
final class NotificationManager {
    var notifications: [AppNotification] = []
    var unreadCount: Int = 0
    var isLoading = false
    var hasMore = true

    private let pageSize = 20

    private static let columns = """
        id, user_id, type, lyric_id, comment_id, collection_id, actor_id, \
        lyric_snippet, song_title, artist_name, share_token, actor_username, \
        comment_content, collection_name, follow_type, follow_value, \
        read_at, created_at
        """

    // MARK: - Fetch Notifications

    func fetchNotifications(userId: UUID, offset: Int = 0) async {
        isLoading = true
        do {
            let result: [AppNotification] = try await supabase
                .from("notifications")
                .select(Self.columns)
                .eq("user_id", value: userId.uuidString)
                .order("created_at", ascending: false)
                .range(from: offset, to: offset + pageSize - 1)
                .execute()
                .value

            if offset == 0 {
                notifications = result
            } else {
                notifications.append(contentsOf: result)
            }
            hasMore = result.count >= pageSize
        } catch {
            print("Fetch notifications error: \(error)")
        }
        isLoading = false
    }

    // MARK: - Unread Count

    private struct IdOnly: Decodable {
        let id: UUID
    }

    func fetchUnreadCount(userId: UUID, lastSeenAt: Date?) async {
        do {
            var query = supabase
                .from("notifications")
                .select("id")
                .eq("user_id", value: userId.uuidString)

            if let lastSeen = lastSeenAt {
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                query = query.gt("created_at", value: formatter.string(from: lastSeen))
            }

            let result: [IdOnly] = try await query
                .execute()
                .value

            unreadCount = result.count
        } catch {
            print("Fetch unread count error: \(error)")
        }
    }

    // MARK: - Mark All Seen

    private struct LastSeenUpdate: Encodable {
        let lastActivitySeenAt: Date

        enum CodingKeys: String, CodingKey {
            case lastActivitySeenAt = "last_activity_seen_at"
        }
    }

    func markAllSeen(userId: UUID) async {
        let now = Date()
        do {
            let update = LastSeenUpdate(lastActivitySeenAt: now)
            try await supabase
                .from("profiles")
                .update(update)
                .eq("id", value: userId.uuidString)
                .execute()

            unreadCount = 0
        } catch {
            print("Mark all seen error: \(error)")
        }
    }

    // MARK: - Send Share Notification

    func sendShareNotification(
        lyricOwnerId: UUID,
        actorId: UUID,
        actorUsername: String,
        lyric: Lyric
    ) async {
        // Don't notify yourself
        guard lyricOwnerId != actorId else { return }

        do {
            let insert = ShareNotificationInsert(
                userId: lyricOwnerId,
                type: "share",
                lyricId: lyric.id,
                actorId: actorId,
                lyricSnippet: lyric.content.count > 80
                    ? String(lyric.content.prefix(80))
                    : lyric.content,
                songTitle: lyric.songTitle,
                artistName: lyric.artistName,
                shareToken: lyric.shareToken,
                actorUsername: actorUsername
            )
            try await supabase
                .from("notifications")
                .insert(insert)
                .execute()
        } catch {
            print("Send share notification error: \(error)")
        }
    }
}
