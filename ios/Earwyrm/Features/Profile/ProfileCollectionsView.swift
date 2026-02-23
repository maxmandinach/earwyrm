import SwiftUI

struct ProfileCollectionsView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(CollectionManager.self) private var collectionManager
    @State private var showCreateSheet = false

    private let columns = [
        GridItem(.flexible(), spacing: Theme.Spacing.md),
        GridItem(.flexible(), spacing: Theme.Spacing.md)
    ]

    var body: some View {
        if collectionManager.collections.isEmpty && !collectionManager.isLoading {
            emptyState
        } else {
            LazyVStack(spacing: Theme.Spacing.md) {
                LazyVGrid(columns: columns, spacing: Theme.Spacing.md) {
                    ForEach(collectionManager.collections) { collection in
                        NavigationLink(value: collection) {
                            CollectionGridCard(collection: collection)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, Theme.Spacing.md)

                // Create button
                Button {
                    showCreateSheet = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle")
                            .font(.system(size: 14))
                        Text("new collection")
                            .font(Theme.dmSans(14, weight: .medium))
                    }
                    .foregroundStyle(Theme.Light.accent)
                    .padding(.vertical, Theme.Spacing.sm)
                }
            }
            .padding(.top, Theme.Spacing.sm)
            .sheet(isPresented: $showCreateSheet) {
                CreateCollectionSheet()
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Spacer().frame(height: 60)
            Text("no collections yet")
                .font(Theme.caveat(28))
                .foregroundStyle(Theme.Light.text)
            Text("Organize your lyrics into collections.")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.Light.muted)
                .multilineTextAlignment(.center)

            Button {
                showCreateSheet = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus.circle")
                        .font(.system(size: 14))
                    Text("create one")
                        .font(Theme.dmSans(14, weight: .medium))
                }
                .foregroundStyle(Theme.Light.accent)
                .padding(.top, Theme.Spacing.xs)
            }
        }
        .padding(.horizontal, Theme.Spacing.lg)
        .sheet(isPresented: $showCreateSheet) {
            CreateCollectionSheet()
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
    }
}

// MARK: - Collection Grid Card

private struct CollectionGridCard: View {
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

                Spacer()

                if collection.isSmart == true {
                    Image(systemName: "sparkles")
                        .font(.system(size: 10))
                        .foregroundStyle(Theme.Light.muted)
                }
            }

            if let desc = collection.description, !desc.isEmpty {
                Text(desc)
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.Light.muted)
                    .lineLimit(2)
            }
        }
        .padding(Theme.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Light.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }
}
