import SwiftUI

/// Animated 5-bar waveform icon for the resonate button.
/// Active state: taller bars. Animating state: bars bounce sequentially.
struct ResonateIcon: View {
    let isActive: Bool
    let isAnimating: Bool
    let size: CGFloat

    // Relative bar heights (proportion of size)
    private let inactiveHeights: [CGFloat] = [0.35, 0.55, 0.7, 0.55, 0.35]
    private let activeHeights: [CGFloat] = [0.5, 0.75, 1.0, 0.75, 0.5]

    @State private var barScales: [CGFloat] = [1, 1, 1, 1, 1]

    var body: some View {
        HStack(alignment: .center, spacing: size * 0.08) {
            ForEach(0..<5, id: \.self) { index in
                let heights = isActive ? activeHeights : inactiveHeights
                let barHeight = heights[index] * size

                RoundedRectangle(cornerRadius: size * 0.06)
                    .fill(isActive ? Theme.accent : Theme.textMuted)
                    .frame(width: max(size * 0.1, 1.5), height: barHeight * barScales[index])
            }
        }
        .frame(width: size, height: size)
        .onChange(of: isAnimating) { _, animating in
            if animating {
                triggerBounce()
            }
        }
    }

    private func triggerBounce() {
        for i in 0..<5 {
            let delay = Double(i) * 0.05
            withAnimation(.spring(response: 0.25, dampingFraction: 0.4).delay(delay)) {
                barScales[i] = 1.3
            }
            withAnimation(.spring(response: 0.3, dampingFraction: 0.5).delay(delay + 0.15)) {
                barScales[i] = 1.0
            }
        }
    }
}
