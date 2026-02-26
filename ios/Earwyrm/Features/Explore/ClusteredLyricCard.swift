import SwiftUI

struct ClusteredLyricCard: View {
    let cluster: LyricCluster

    // Pass-through interaction callbacks
    var hasReacted: Bool = false
    var reactionCount: Int?
    var isResonateAnimating: Bool = false
    var onResonate: (() -> Void)?
    var onComment: (() -> Void)?
    var onSave: (() -> Void)?
    var onShare: (() -> Void)?
    var isSaved: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            CompactLyricCard(
                lyric: cluster.representative,
                onShare: onShare,
                onSave: onSave,
                isSaved: isSaved,
                hasReacted: hasReacted,
                reactionCount: reactionCount,
                isResonateAnimating: isResonateAnimating,
                onResonate: onResonate,
                onComment: onComment
            )

            if cluster.saveCount > 1 {
                Text("\(cluster.saveCount) people saved this")
                    .font(Theme.dmSans(11))
                    .foregroundStyle(Theme.accent)
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.top, 4)
                    .padding(.bottom, 6)
            }
        }
    }
}
