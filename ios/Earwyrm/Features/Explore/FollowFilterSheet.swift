import SwiftUI

struct FollowFilterSheet: View {
    let follows: [Follow]
    @Binding var activeFollowIds: Set<UUID>
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    private var artists: [Follow] {
        follows.filter { $0.filterType == "artist" && matchesSearch($0) }
    }

    private var songs: [Follow] {
        follows.filter { $0.filterType == "song" && matchesSearch($0) }
    }

    private var tags: [Follow] {
        follows.filter { $0.filterType == "tag" && matchesSearch($0) }
    }

    private func matchesSearch(_ follow: Follow) -> Bool {
        guard !search.isEmpty else { return true }
        return follow.filterValue.localizedCaseInsensitiveContains(search)
    }

    var body: some View {
        NavigationStack {
            List {
                HStack(spacing: Theme.Spacing.sm) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.textMuted)
                    TextField("Search follows...", text: $search)
                        .font(Theme.dmSans(14))
                }
                .listRowBackground(Theme.card)

                if !artists.isEmpty {
                    followSection(title: "Artists", items: artists)
                }
                if !songs.isEmpty {
                    followSection(title: "Songs", items: songs)
                }
                if !tags.isEmpty {
                    followSection(title: "Tags", items: tags)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Filter follows")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Clear all") {
                        activeFollowIds.removeAll()
                        Haptics.light()
                    }
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.accent)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(Theme.accent)
                }
            }
        }
    }

    @ViewBuilder
    private func followSection(title: String, items: [Follow]) -> some View {
        Section {
            ForEach(items) { follow in
                Button {
                    if activeFollowIds.contains(follow.id) {
                        activeFollowIds.remove(follow.id)
                    } else {
                        activeFollowIds.insert(follow.id)
                    }
                    Haptics.light()
                } label: {
                    HStack {
                        Text(follow.filterType == "tag"
                             ? "#\(follow.filterValue)"
                             : follow.filterValue)
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.textPrimary)

                        Spacer()

                        if activeFollowIds.contains(follow.id) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Theme.accent)
                        } else {
                            Image(systemName: "circle")
                                .foregroundStyle(Theme.textMuted)
                        }
                    }
                }
                .listRowBackground(Theme.card)
            }
        } header: {
            HStack {
                Text(title)
                    .font(Theme.dmSans(12, weight: .semibold))
                    .foregroundStyle(Theme.textSecondary)

                Spacer()

                Button("Select all") {
                    for f in items {
                        activeFollowIds.insert(f.id)
                    }
                    Haptics.light()
                }
                .font(Theme.dmSans(11))
                .foregroundStyle(Theme.accent)
            }
        }
    }
}
