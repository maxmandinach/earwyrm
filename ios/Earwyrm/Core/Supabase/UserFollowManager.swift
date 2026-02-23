import Foundation
import Supabase

@Observable
@MainActor
final class UserFollowManager {
    var followingIds: Set<UUID> = []
    var isLoading = false

    // MARK: - Fetch

    func fetchFollowing(userId: UUID) async {
        isLoading = true
        do {
            let result: [UserFollow] = try await supabase
                .from("user_follows")
                .select("id, follower_id, following_id, created_at")
                .eq("follower_id", value: userId.uuidString)
                .execute()
                .value

            followingIds = Set(result.map(\.followingId))
        } catch {
            print("Fetch user following error: \(error)")
        }
        isLoading = false
    }

    // MARK: - Follow

    func follow(currentUserId: UUID, targetUserId: UUID) async {
        // Optimistic update
        followingIds.insert(targetUserId)
        Haptics.medium()

        do {
            let insert = UserFollowInsert(followerId: currentUserId, followingId: targetUserId)
            try await supabase
                .from("user_follows")
                .insert(insert)
                .execute()
        } catch {
            // Handle duplicate key silently
            let desc = String(describing: error)
            if desc.contains("23505") {
                return
            }
            followingIds.remove(targetUserId)
            print("User follow error: \(error)")
        }
    }

    // MARK: - Unfollow

    func unfollow(currentUserId: UUID, targetUserId: UUID) async {
        // Optimistic update
        followingIds.remove(targetUserId)
        Haptics.light()

        do {
            try await supabase
                .from("user_follows")
                .delete()
                .eq("follower_id", value: currentUserId.uuidString)
                .eq("following_id", value: targetUserId.uuidString)
                .execute()
        } catch {
            followingIds.insert(targetUserId)
            print("User unfollow error: \(error)")
        }
    }

    // MARK: - Query

    func isFollowing(_ targetUserId: UUID) -> Bool {
        followingIds.contains(targetUserId)
    }

    // MARK: - Fetch Followers

    func fetchFollowerIds(userId: UUID) async -> [UUID] {
        do {
            let result: [UserFollow] = try await supabase
                .from("user_follows")
                .select("id, follower_id, following_id, created_at")
                .eq("following_id", value: userId.uuidString)
                .execute()
                .value
            return result.map(\.followerId)
        } catch {
            print("Fetch followers error: \(error)")
            return []
        }
    }

    // MARK: - Counts (for profile owner only)

    struct FollowCounts {
        let followers: Int
        let following: Int
    }

    func fetchCounts(userId: UUID) async -> FollowCounts {
        do {
            let followers: [UserFollow] = try await supabase
                .from("user_follows")
                .select("id, follower_id, following_id, created_at")
                .eq("following_id", value: userId.uuidString)
                .execute()
                .value

            let following: [UserFollow] = try await supabase
                .from("user_follows")
                .select("id, follower_id, following_id, created_at")
                .eq("follower_id", value: userId.uuidString)
                .execute()
                .value

            return FollowCounts(followers: followers.count, following: following.count)
        } catch {
            print("Fetch follow counts error: \(error)")
            return FollowCounts(followers: 0, following: 0)
        }
    }
}
