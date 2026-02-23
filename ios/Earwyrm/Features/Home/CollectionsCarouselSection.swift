import SwiftUI

struct CollectionsCarouselSection: View {
    let collections: [Collection]

    var body: some View {
        if !collections.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                CaveatText(text: "your collections", size: 24, color: Theme.Light.secondary)
                    .padding(.horizontal, Theme.Spacing.lg)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Spacing.md) {
                        ForEach(collections) { collection in
                            NavigationLink(value: collection) {
                                CollectionCarouselCard(collection: collection)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.lg)
                }
            }
        }
    }
}
