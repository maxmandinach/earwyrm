import SwiftUI

struct PlusBadge: View {
    var size: CGFloat = 12

    var body: some View {
        CaveatText(text: "e", size: size, weight: .semibold, color: Theme.textSecondary)
    }
}
