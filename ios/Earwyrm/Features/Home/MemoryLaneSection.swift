import SwiftUI

struct MemoryLaneSection: View {
    let lyrics: [Lyric]

    var body: some View {
        if lyrics.count >= 3 {
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                Text("memory lane")
                    .font(Theme.caveat(24))
                    .foregroundStyle(Theme.Light.text)
                    .padding(.horizontal, Theme.Spacing.lg)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Spacing.md) {
                        ForEach(lyrics) { lyric in
                            MemoryLaneCard(lyric: lyric)
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.lg)
                }
            }
        }
    }
}
