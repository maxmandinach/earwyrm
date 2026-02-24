import SwiftUI

struct UserFollowButton: View {
    let targetUserId: UUID
    @Environment(AuthManager.self) private var auth
    @Environment(UserFollowManager.self) private var userFollowManager

    private var isFollowing: Bool {
        userFollowManager.isFollowing(targetUserId)
    }

    var body: some View {
        Button {
            Task {
                guard let userId = auth.userId else { return }
                if isFollowing {
                    await userFollowManager.unfollow(currentUserId: userId, targetUserId: targetUserId)
                } else {
                    await userFollowManager.follow(currentUserId: userId, targetUserId: targetUserId)
                }
            }
        } label: {
            Text(isFollowing ? "following" : "follow")
                .font(Theme.dmSans(13, weight: .medium))
                .foregroundStyle(isFollowing ? Theme.textPrimary : .white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isFollowing ? Theme.card : Theme.accent)
                )
                .overlay(
                    Capsule()
                        .strokeBorder(
                            isFollowing ? Theme.dividerColor : Color.clear,
                            lineWidth: 1
                        )
                )
        }
        .animation(.easeInOut(duration: 0.2), value: isFollowing)
    }
}
