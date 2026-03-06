import SwiftUI

struct PlusBadge: View {
    var size: CGFloat = 14

    var body: some View {
        Text("e+")
            .font(.custom("Caveat", size: size).weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, size * 0.5)
            .padding(.vertical, size * 0.15)
            .background(
                LinearGradient(
                    colors: [Color(hex: "#C8B8A8"), Color(hex: "#A08878")],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: size * 0.35))
            .shadow(color: .black.opacity(0.15), radius: 2, y: 0.5)
    }
}
