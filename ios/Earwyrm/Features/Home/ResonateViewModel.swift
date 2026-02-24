import Foundation
import Supabase

/// Ports useResonate hook: optimistic toggle, animated feedback, revert on error.
@Observable
@MainActor
final class ResonateViewModel {
    var hasReacted = false
    var count: Int
    var isAnimating = false

    private let lyricId: UUID
    private let userId: UUID
    private var animationTask: Task<Void, Never>?
    var toast: ToastManager?

    init(lyricId: UUID, userId: UUID, initialCount: Int, toast: ToastManager? = nil) {
        self.lyricId = lyricId
        self.userId = userId
        self.count = initialCount
        self.toast = toast
    }

    /// Check if user has already reacted to this lyric.
    func checkInitialState() async {
        do {
            let reactions: [Reaction] = try await supabase
                .from("reactions")
                .select("id, lyric_id, user_id, created_at")
                .eq("lyric_id", value: lyricId.uuidString)
                .eq("user_id", value: userId.uuidString)
                .limit(1)
                .execute()
                .value

            hasReacted = !reactions.isEmpty
        } catch {
            print("Check reaction error: \(error)")
        }
    }

    /// Toggle reaction with optimistic UI update.
    func toggle() {
        let wasReacted = hasReacted

        // Optimistic update
        hasReacted = !wasReacted
        count += wasReacted ? -1 : 1

        // Trigger animation on new reaction
        if !wasReacted {
            isAnimating = true
            animationTask?.cancel()
            animationTask = Task {
                try? await Task.sleep(nanoseconds: 600_000_000) // 600ms
                guard !Task.isCancelled else { return }
                isAnimating = false
            }
        }

        // Haptic feedback
        if wasReacted {
            Haptics.light()
        } else {
            Haptics.medium()
        }

        // Server call
        Task {
            do {
                if wasReacted {
                    try await supabase
                        .from("reactions")
                        .delete()
                        .eq("lyric_id", value: lyricId.uuidString)
                        .eq("user_id", value: userId.uuidString)
                        .execute()
                } else {
                    let insert = ReactionInsert(lyricId: lyricId, userId: userId)
                    try await supabase
                        .from("reactions")
                        .insert(insert)
                        .execute()
                }
            } catch {
                // Revert on error
                hasReacted = wasReacted
                count += wasReacted ? 1 : -1
                toast?.show("couldn't resonate, try again")
                print("Toggle reaction error: \(error)")
            }
        }
    }
}
