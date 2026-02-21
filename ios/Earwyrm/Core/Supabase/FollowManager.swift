import Foundation
import Supabase

@Observable
@MainActor
final class FollowManager {
    var follows: [Follow] = []
    var isLoading = false

    func fetchFollows(userId: UUID) async {
        isLoading = true
        do {
            let result: [Follow] = try await supabase
                .from("follows")
                .select("id, user_id, filter_type, filter_value, created_at")
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value
            follows = result
        } catch {
            print("Fetch follows error: \(error)")
        }
        isLoading = false
    }

    func follow(userId: UUID, type: String, value: String) async {
        let tempId = UUID()
        let optimistic = Follow(
            id: tempId,
            userId: userId,
            filterType: type,
            filterValue: value,
            createdAt: Date()
        )
        follows.append(optimistic)
        Haptics.medium()

        do {
            let insert = FollowInsert(userId: userId, filterType: type, filterValue: value)
            let created: Follow = try await supabase
                .from("follows")
                .insert(insert)
                .select("id, user_id, filter_type, filter_value, created_at")
                .single()
                .execute()
                .value

            if let idx = follows.firstIndex(where: { $0.id == tempId }) {
                follows[idx] = created
            }
        } catch {
            // Silently handle duplicate key (23505)
            let desc = String(describing: error)
            if desc.contains("23505") {
                return
            }
            follows.removeAll { $0.id == tempId }
            print("Follow error: \(error)")
        }
    }

    func unfollow(userId: UUID, type: String, value: String) async {
        let removed = follows.filter {
            $0.filterType == type && $0.filterValue.caseInsensitiveCompare(value) == .orderedSame
        }
        follows.removeAll {
            $0.filterType == type && $0.filterValue.caseInsensitiveCompare(value) == .orderedSame
        }
        Haptics.light()

        do {
            for follow in removed {
                try await supabase
                    .from("follows")
                    .delete()
                    .eq("id", value: follow.id.uuidString)
                    .execute()
            }
        } catch {
            follows.append(contentsOf: removed)
            print("Unfollow error: \(error)")
        }
    }

    func isFollowing(type: String, value: String) -> Bool {
        follows.contains {
            $0.filterType == type && $0.filterValue.caseInsensitiveCompare(value) == .orderedSame
        }
    }
}
