import SwiftUI

struct CollectionCarouselCard: View {
    let collection: Collection

    private var accentColor: Color {
        CollectionColors.color(for: collection.color ?? "charcoal")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(accentColor)
                    .frame(width: 4, height: 20)

                CaveatText(text: collection.name, size: 20, color: Theme.Light.text)
            }

            Spacer(minLength: 0)

            if let desc = collection.description, !desc.isEmpty {
                Text(desc)
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.Light.muted)
                    .lineLimit(2)
            }

            HStack {
                if collection.isSmart == true {
                    Image(systemName: "sparkles")
                        .font(.system(size: 10))
                        .foregroundStyle(Theme.Light.muted)
                }
                Spacer()
            }
        }
        .padding(Theme.Spacing.md)
        .frame(width: 160, height: 120)
        .background(Theme.Light.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
    }
}
