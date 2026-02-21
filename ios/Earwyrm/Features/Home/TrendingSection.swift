import SwiftUI

struct TrendingSection: View {
    let lyrics: [LyricWithProfile]

    var body: some View {
        if !lyrics.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                Text("trending")
                    .font(Theme.caveat(24))
                    .foregroundStyle(Theme.Light.text)
                    .padding(.horizontal, Theme.Spacing.lg)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Spacing.md) {
                        ForEach(lyrics) { item in
                            NavigationLink(value: item) {
                                SocialLyricCard(item: item)
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
