import SwiftUI

struct ActivityView: View {
    var body: some View {
        ZStack {
            Theme.Light.background
                .ignoresSafeArea()

            VStack(spacing: Theme.Spacing.md) {
                Text("activity")
                    .font(Theme.caveat(32))
                    .foregroundStyle(Theme.Light.text)
                Text("Coming soon")
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.Light.muted)
            }
        }
    }
}
