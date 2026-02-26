import SwiftUI

struct ClusteredLyricCard: View {
    let cluster: LyricCluster

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            CompactLyricCard(lyric: cluster.representative)

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
