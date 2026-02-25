import SwiftUI

struct OfflineBanner: View {
    @Environment(NetworkMonitor.self) private var network

    var body: some View {
        Group {
            if !network.isConnected {
                Text("no connection")
                    .font(Theme.dmSans(13, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Theme.Spacing.xs)
                    .background(Theme.textPrimary.opacity(0.85))
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.35), value: network.isConnected)
    }
}
