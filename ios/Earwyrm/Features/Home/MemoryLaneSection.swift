import SwiftUI

struct MemoryLaneSection: View {
    let lyrics: [Lyric]
    var showUpsell: Bool = false

    var body: some View {
        if lyrics.count >= 3 {
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                CaveatText(text: "memory lane", size: 24, color: Theme.textSecondary)
                    .padding(.horizontal, Theme.Spacing.lg)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Spacing.md) {
                        ForEach(lyrics) { lyric in
                            NavigationLink(value: LyricWithProfile(lyric: lyric, username: nil)) {
                                MemoryLaneCard(lyric: lyric)
                            }
                            .buttonStyle(.plain)
                        }
                        if showUpsell {
                            MemoryLaneUpsellCard()
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.lg)
                }
            }
        }
    }
}
