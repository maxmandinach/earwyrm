import SwiftUI

struct PlusBadge: View {
    var size: CGFloat = 12
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        CaveatText(
            text: "e",
            size: size,
            weight: .semibold,
            color: colorScheme == .dark ? Color(hex: "2C2825") : Theme.accent
        )
        .padding(.horizontal, size * 0.3)
        .padding(.vertical, size * 0.1)
        .background(
            Capsule()
                .fill(colorScheme == .dark ? Theme.accent : Color(hex: "2C2825"))
        )
    }
}
