import SwiftUI

struct FollowFeedSection: View {
    let lyrics: [LyricWithProfile]
    var onShare: ((LyricWithProfile) -> Void)?
    var onSave: ((LyricWithProfile) -> Void)?
    var onResonate: ((LyricWithProfile) -> Void)?
    var onViewProfile: ((LyricWithProfile) -> Void)?
    var onReport: ((LyricWithProfile) -> Void)?
    var onBlock: ((LyricWithProfile) -> Void)?
    var isLyricSaved: ((UUID) -> Bool)?
    var hasReacted: ((UUID) -> Bool)?
    var reactionCount: ((UUID) -> Int)?

    var body: some View {
        if !lyrics.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                CaveatText(text: "from your follows", size: 24, color: Theme.textSecondary)
                    .padding(.horizontal, Theme.Spacing.lg)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Spacing.md) {
                        ForEach(lyrics) { item in
                            NavigationLink(value: item) {
                                SocialLyricCard(
                                    item: item,
                                    onShare: onShare != nil ? { onShare?(item) } : nil,
                                    onSave: onSave != nil ? { onSave?(item) } : nil,
                                    onResonate: onResonate != nil ? { onResonate?(item) } : nil,
                                    onViewProfile: onViewProfile != nil ? { onViewProfile?(item) } : nil,
                                    onReport: onReport != nil ? { onReport?(item) } : nil,
                                    onBlock: onBlock != nil ? { onBlock?(item) } : nil,
                                    isSaved: isLyricSaved?(item.lyric.id) ?? false,
                                    hasReacted: hasReacted?(item.lyric.id) ?? false,
                                    reactionCount: reactionCount?(item.lyric.id) ?? item.lyric.reactionCount ?? 0
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.lg)
                }
            }
        }
    }
}
