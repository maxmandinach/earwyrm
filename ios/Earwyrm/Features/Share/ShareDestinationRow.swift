import SwiftUI

struct ShareDestinationRow: View {
    let destinations: [ShareDestination]
    let onSelect: (ShareDestination) -> Void

    private let iconSize: CGFloat = 56
    private let cornerRadius: CGFloat = 13

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 20) {
                ForEach(destinations) { destination in
                    Button {
                        onSelect(destination)
                    } label: {
                        VStack(spacing: 6) {
                            destinationIcon(destination)
                                .frame(width: iconSize, height: iconSize)
                                .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))

                            Text(destination.label)
                                .font(Theme.dmSans(11))
                                .foregroundStyle(Theme.textSecondary)
                                .lineLimit(1)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    @ViewBuilder
    private func destinationIcon(_ destination: ShareDestination) -> some View {
        ZStack {
            // Background: gradient or solid color
            if let gradient = destination.iconGradient {
                gradient
            } else {
                destination.iconBackground
            }

            // Foreground: asset image or SF Symbol
            if let asset = destination.iconAsset,
               let _ = UIImage(named: asset) {
                Image(asset)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .padding(14)
            } else {
                Image(systemName: destination.sfSymbol)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(.white)
            }
        }
        .overlay {
            if destination.needsDarkModeBorder {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.15), lineWidth: 1)
            }
        }
    }
}
