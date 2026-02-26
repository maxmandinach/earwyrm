import SwiftUI

struct PageStatsRow: View {
    let stats: PageStats

    var body: some View {
        HStack(spacing: Theme.Spacing.xl) {
            statItem(value: "\(stats.lyricCount)", label: "saves")

            if stats.uniqueUsers > 1 {
                statItem(value: "\(stats.uniqueUsers)", label: "people")
            }

            if let songCount = stats.songCount {
                statItem(value: "\(songCount)", label: "songs")
            }

            statItem(value: "\(stats.totalResonances)", label: "resonations")

            if stats.totalComments > 0 {
                statItem(value: "\(stats.totalComments)", label: "comments")
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(Theme.dmSans(18, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
            Text(label)
                .font(Theme.dmSans(12))
                .foregroundStyle(Theme.textMuted)
        }
    }
}
