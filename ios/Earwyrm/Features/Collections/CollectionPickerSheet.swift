import SwiftUI

struct CollectionPickerSheet: View {
    let lyricId: UUID
    @Environment(AuthManager.self) private var auth
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(\.dismiss) private var dismiss

    @State private var membershipIds: Set<UUID> = []
    @State private var isLoading = true
    @State private var showCreateSheet = false
    @State private var showPaywall = false

    private var manualCollections: [Collection] {
        collectionManager.collections.filter { $0.isSmart != true }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if isLoading {
                    Spacer()
                    ProgressView()
                        .tint(Theme.Light.accent)
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            // Favorites quick-add (first manual collection named "Favorites")
                            if let favorites = manualCollections.first(where: { $0.name == "Favorites" }) {
                                collectionRow(favorites, isFavorites: true)
                                Divider()
                                    .foregroundStyle(Theme.Light.divider)
                                    .padding(.horizontal, Theme.Spacing.md)
                            }

                            // Other manual collections
                            ForEach(manualCollections.filter { $0.name != "Favorites" }) { collection in
                                collectionRow(collection)
                                if collection.id != manualCollections.filter({ $0.name != "Favorites" }).last?.id {
                                    Divider()
                                        .foregroundStyle(Theme.Light.divider)
                                        .padding(.horizontal, Theme.Spacing.md)
                                }
                            }

                            // New collection row
                            Button {
                                if subscriptionManager.canCreateCollection(currentCount: manualCollections.count) {
                                    showCreateSheet = true
                                } else {
                                    showPaywall = true
                                }
                            } label: {
                                HStack(spacing: 10) {
                                    Image(systemName: "plus.circle")
                                        .font(.system(size: 16))
                                        .foregroundStyle(Theme.Light.accent)
                                    Text("New Collection")
                                        .font(Theme.dmSans(15, weight: .medium))
                                        .foregroundStyle(Theme.Light.accent)
                                    Spacer()
                                }
                                .padding(.horizontal, Theme.Spacing.lg)
                                .padding(.vertical, 14)
                            }
                        }
                    }
                }
            }
            .background(Theme.Light.background)
            .navigationTitle("Save to Collection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .font(Theme.dmSans(15, weight: .medium))
                        .foregroundStyle(Theme.Light.accent)
                }
            }
        }
        .task {
            membershipIds = await collectionManager.collectionIdsContaining(lyricId: lyricId)
            isLoading = false
        }
        .sheet(isPresented: $showCreateSheet) {
            CreateCollectionSheet()
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showPaywall) {
            EarwyrmPlusPaywall()
                .presentationDragIndicator(.visible)
        }
    }

    private func collectionRow(_ collection: Collection, isFavorites: Bool = false) -> some View {
        let isMember = membershipIds.contains(collection.id)

        return Button {
            Haptics.selection()
            Task {
                if isMember {
                    await collectionManager.removeLyricFromCollection(lyricId: lyricId, collectionId: collection.id)
                    membershipIds.remove(collection.id)
                } else {
                    await collectionManager.addLyricToCollection(lyricId: lyricId, collectionId: collection.id)
                    membershipIds.insert(collection.id)
                }
            }
        } label: {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(CollectionColors.color(for: collection.color ?? "charcoal"))
                    .frame(width: 4, height: 20)

                if isFavorites {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(CollectionColors.color(for: "coral"))
                }

                Text(collection.name)
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.Light.text)

                Spacer()

                Image(systemName: isMember ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18))
                    .foregroundStyle(isMember ? Theme.Light.accent : Theme.Light.muted)
            }
            .padding(.horizontal, Theme.Spacing.lg)
            .padding(.vertical, 14)
        }
    }
}
