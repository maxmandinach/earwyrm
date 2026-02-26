import SwiftUI

struct MostSavedSection: View {
    let clusters: [LyricCluster]

    var body: some View {
        if !clusters.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                Text(clusters.count == 1 ? "most saved line" : "most saved lines")
                    .font(Theme.caveat(22))
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal, Theme.Spacing.md)

                ForEach(clusters) { cluster in
                    ClusteredLyricCard(cluster: cluster)
                        .padding(.horizontal, Theme.Spacing.md)
                }
            }
        }
    }
}
