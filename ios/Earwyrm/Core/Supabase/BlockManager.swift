import Foundation
import Supabase

@Observable
@MainActor
final class BlockManager {
    var blockedUserIds: Set<UUID> = []

    // MARK: - Fetch

    func fetchBlockedUsers(userId: UUID) async {
        do {
            let result: [UserBlock] = try await supabase
                .from("user_blocks")
                .select("id, blocker_id, blocked_user_id, created_at")
                .eq("blocker_id", value: userId.uuidString)
                .execute()
                .value

            blockedUserIds = Set(result.map(\.blockedUserId))
        } catch {
            print("Fetch blocked users error: \(error)")
        }
    }

    // MARK: - Block

    func block(currentUserId: UUID, targetUserId: UUID) async {
        // Optimistic update
        blockedUserIds.insert(targetUserId)
        Haptics.medium()

        do {
            let insert = UserBlockInsert(blockerId: currentUserId, blockedUserId: targetUserId)
            try await supabase
                .from("user_blocks")
                .insert(insert)
                .execute()
        } catch {
            // Handle duplicate key silently
            let desc = String(describing: error)
            if desc.contains("23505") {
                return
            }
            blockedUserIds.remove(targetUserId)
            print("Block user error: \(error)")
        }
    }

    // MARK: - Unblock

    func unblock(currentUserId: UUID, targetUserId: UUID) async {
        // Optimistic update
        blockedUserIds.remove(targetUserId)
        Haptics.light()

        do {
            try await supabase
                .from("user_blocks")
                .delete()
                .eq("blocker_id", value: currentUserId.uuidString)
                .eq("blocked_user_id", value: targetUserId.uuidString)
                .execute()
        } catch {
            blockedUserIds.insert(targetUserId)
            print("Unblock user error: \(error)")
        }
    }

    // MARK: - Query

    func isBlocked(_ userId: UUID) -> Bool {
        blockedUserIds.contains(userId)
    }

    // MARK: - Report Content

    func reportContent(reporterId: UUID, contentType: String, contentId: UUID, reason: String) async -> Bool {
        do {
            let insert = ContentReportInsert(
                reporterId: reporterId,
                contentType: contentType,
                contentId: contentId,
                reason: reason
            )
            try await supabase
                .from("content_reports")
                .insert(insert)
                .execute()

            Haptics.success()
            return true
        } catch {
            let desc = String(describing: error)
            if desc.contains("23505") {
                // Already reported
                return true
            }
            print("Report content error: \(error)")
            return false
        }
    }
}
