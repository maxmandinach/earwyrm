import SwiftUI

struct FollowButton: View {
    let isFollowing: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(isFollowing ? "following" : "follow")
                .font(Theme.dmSans(13, weight: .medium))
                .foregroundStyle(isFollowing ? Theme.Light.text : .white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isFollowing ? Theme.Light.card : Theme.Light.accent)
                )
                .overlay(
                    Capsule()
                        .strokeBorder(
                            isFollowing ? Theme.Light.divider : Color.clear,
                            lineWidth: 1
                        )
                )
        }
        .animation(.easeInOut(duration: 0.2), value: isFollowing)
    }
}
