import SwiftUI

/// Elegant generating overlay with pulsing wand icon and shimmer.
struct ArtGeneratingOverlay: View {
    @State private var pulse = false
    @State private var shimmerOffset: CGFloat = -200

    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(.ultraThinMaterial)
            .overlay {
                VStack(spacing: 16) {
                    // Pulsing wand icon
                    ZStack {
                        Circle()
                            .fill(Theme.accent.opacity(0.08))
                            .frame(width: 64, height: 64)
                            .scaleEffect(pulse ? 1.2 : 0.9)
                            .opacity(pulse ? 0 : 0.6)

                        Circle()
                            .fill(Theme.accent.opacity(0.05))
                            .frame(width: 48, height: 48)

                        Image(systemName: "wand.and.stars")
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(Theme.accent)
                            .rotationEffect(.degrees(pulse ? 5 : -5))
                    }

                    // Text with shimmer
                    Text("creating your artwork")
                        .font(Theme.caveat(22))
                        .foregroundStyle(Theme.textSecondary)
                        .overlay {
                            LinearGradient(
                                colors: [.clear, Theme.accent.opacity(0.3), .clear],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                            .frame(width: 80)
                            .offset(x: shimmerOffset)
                            .mask {
                                Text("creating your artwork")
                                    .font(Theme.caveat(22))
                            }
                        }
                        .clipped()
                }
            }
            .onAppear {
                withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                    pulse = true
                }
                withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: false)) {
                    shimmerOffset = 250
                }
            }
    }
}
