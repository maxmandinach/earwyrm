import SwiftUI

struct CascadeReveal: ViewModifier {
    let delay: Double

    @State private var isVisible = false

    func body(content: Content) -> some View {
        content
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 12)
            .task {
                try? await Task.sleep(for: .seconds(delay))
                withAnimation(.easeOut(duration: 0.5)) {
                    isVisible = true
                }
            }
    }
}

extension View {
    func cascadeReveal(delay: Double) -> some View {
        modifier(CascadeReveal(delay: delay))
    }
}
