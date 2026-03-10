import SwiftUI

struct PlusBadge: View {
    var size: CGFloat = 14

    var body: some View {
        Image(systemName: "checkmark.seal.fill")
            .font(.system(size: size, weight: .semibold))
            .foregroundStyle(
                LinearGradient(
                    colors: [Color(hex: "#C8B8A8"), Color(hex: "#A08878")],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
    }
}
