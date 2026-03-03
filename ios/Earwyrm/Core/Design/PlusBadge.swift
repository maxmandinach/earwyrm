import SwiftUI

struct PlusBadge: View {
    var size: CGFloat = 12

    var body: some View {
        Text("e")
            .font(.custom("Caveat", size: size).weight(.semibold))
            .foregroundStyle(Theme.accent)
    }
}
