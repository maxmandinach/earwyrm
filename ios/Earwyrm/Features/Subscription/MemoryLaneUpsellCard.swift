import SwiftUI

struct MemoryLaneUpsellCard: View {
    @Environment(SubscriptionGate.self) private var subscriptionGate

    var body: some View {
        Button {
            Haptics.light()
            subscriptionGate.showPaywall = true
        } label: {
            VStack(spacing: Theme.Spacing.sm) {
                Spacer(minLength: 0)

                Image(systemName: "clock.arrow.circlepath")
                    .font(.system(size: 24))
                    .foregroundStyle(Theme.accent)

                Text("see all")
                    .font(Theme.caveat(22))
                    .foregroundStyle(Theme.accent)

                Text("unlock your full\nmemory lane")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.textMuted)
                    .multilineTextAlignment(.center)
                    .lineSpacing(2)

                Spacer(minLength: 0)
            }
            .padding(Theme.Spacing.md)
            .frame(width: 240, height: 150)
            .background(Theme.background)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                    .foregroundStyle(Theme.accent.opacity(0.4))
            )
        }
    }
}
