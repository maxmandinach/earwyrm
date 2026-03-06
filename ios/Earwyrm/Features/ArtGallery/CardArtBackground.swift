import SwiftUI

/// Reusable AI art background for card views.
/// When a lyric has `cardArtUrl`, displays it as a subtle background
/// with gradient overlay for text readability.
struct CardArtBackground: View {
    let url: String
    var opacity: Double = 0.15
    var gradientStart: Double = 0.3
    var gradientEnd: Double = 0.85

    var body: some View {
        GeometryReader { geo in
            AsyncImage(url: URL(string: url)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                        .opacity(opacity)
                        .overlay(
                            LinearGradient(
                                colors: [Theme.card.opacity(gradientStart), Theme.card.opacity(gradientEnd)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                default:
                    EmptyView()
                }
            }
        }
    }
}

extension View {
    /// Apply AI art background when `cardArtUrl` exists on a lyric.
    @ViewBuilder
    func cardArtBackground(
        url: String?,
        opacity: Double = 0.15,
        gradientStart: Double = 0.3,
        gradientEnd: Double = 0.85
    ) -> some View {
        if let url {
            self.background(
                CardArtBackground(
                    url: url,
                    opacity: opacity,
                    gradientStart: gradientStart,
                    gradientEnd: gradientEnd
                )
            )
        } else {
            self
        }
    }
}
