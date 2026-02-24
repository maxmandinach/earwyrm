import SwiftUI

struct FollowButton: View {
    let isFollowing: Bool
    let action: () -> Void

    var body: some View {
        Button(action: {
            Haptics.medium()
            action()
        }) {
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
        .accessibilityLabel(isFollowing ? "Unfollow" : "Follow")
    }
}
