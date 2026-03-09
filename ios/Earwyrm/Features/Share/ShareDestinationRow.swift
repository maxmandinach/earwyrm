import SwiftUI

struct ShareDestinationRow: View {
    let destinations: [ShareDestination]
    let onSelect: (ShareDestination) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 20) {
                ForEach(destinations) { destination in
                    Button {
                        onSelect(destination)
                    } label: {
                        VStack(spacing: 6) {
                            destinationIcon(destination)
                                .frame(width: 56, height: 56)
                                .clipShape(Circle())

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
        if let asset = destination.iconAsset,
           let _ = UIImage(named: asset) {
            Image(asset)
                .resizable()
                .aspectRatio(contentMode: .fit)
        } else {
            Image(systemName: destination.sfSymbol)
                .font(.system(size: 28))
                .foregroundStyle(Theme.textSecondary)
                .frame(width: 56, height: 56)
                .background(Theme.card)
                .overlay(Circle().strokeBorder(Theme.dividerColor, lineWidth: 1))
        }
    }
}
