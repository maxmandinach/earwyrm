import SwiftUI

struct FollowFeedSection: View {
    let lyrics: [LyricWithProfile]
    var onShare: ((LyricWithProfile) -> Void)?

    var body: some View {
        if !lyrics.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                CaveatText(text: "from your follows", size: 24, color: Theme.Light.secondary)
                    .padding(.horizontal, Theme.Spacing.lg)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Spacing.md) {
                        ForEach(lyrics) { item in
                            NavigationLink(value: item) {
                                SocialLyricCard(item: item, onShare: onShare != nil ? { onShare?(item) } : nil)
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
