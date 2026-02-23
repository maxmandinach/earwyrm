import SwiftUI

struct CollectionDetailView: View {
    let collection: Collection
    @Environment(AuthManager.self) private var auth
    @Environment(CollectionManager.self) private var collectionManager
    @State private var showEditSheet = false
    @State private var showDeleteConfirm = false
    @Environment(\.dismiss) private var dismiss

    private var lyrics: [Lyric] {
        collectionManager.collectionLyrics[collection.id] ?? []
    }

    private var accentColor: Color {
        CollectionColors.color(for: collection.color ?? "charcoal")
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.Spacing.md) {
                // Header
                header

                if lyrics.isEmpty {
                    emptyState
                } else {
                    LazyVStack(spacing: Theme.Spacing.sm) {
                        ForEach(lyrics) { lyric in
                            NavigationLink(value: LyricWithProfile(lyric: lyric, username: nil)) {
                                CollectionLyricRow(
                                    lyric: lyric,
                                    isSmart: collection.isSmart == true,
                                    onRemove: {
                                        Task {
                                            await collectionManager.removeLyricFromCollection(
                                                lyricId: lyric.id,
                                                collectionId: collection.id
                                            )
                                        }
                                    }
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.md)
                }

                Spacer().frame(height: Theme.Spacing.xl)
            }
        }
        .background(Theme.Light.background)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        showEditSheet = true
                    } label: {
                        Label("Edit collection", systemImage: "pencil")
                    }
                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label("Delete collection", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.Light.secondary)
                }
            }
        }
        .task {
            await collectionManager.fetchLyricsForCollection(
                collectionId: collection.id,
                smartTag: collection.isSmart == true ? collection.smartTag : nil
            )
        }
        .sheet(isPresented: $showEditSheet) {
            CreateCollectionSheet(existing: collection)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .alert("Delete Collection", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                Haptics.warning()
                Task {
                    await collectionManager.deleteCollection(id: collection.id)
                    dismiss()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete \"\(collection.name)\" and remove all lyrics from it.")
        }
    }

    private var header: some View {
        VStack(spacing: Theme.Spacing.sm) {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(accentColor)
                    .frame(width: 5, height: 28)

                CaveatText(text: collection.name, size: 28, color: Theme.Light.text)

                if collection.isSmart == true {
                    Text("auto-updated")
                        .font(Theme.dmSans(11))
                        .foregroundStyle(Theme.Light.muted)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Theme.Light.card)
                        .clipShape(Capsule())
                }

                Spacer()
            }

            if let desc = collection.description, !desc.isEmpty {
                Text(desc)
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.Light.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Text("\(lyrics.count) lyric\(lyrics.count == 1 ? "" : "s")")
                .font(Theme.dmSans(13))
                .foregroundStyle(Theme.Light.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.top, Theme.Spacing.md)
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Spacer().frame(height: 40)
            Text("no lyrics yet")
                .font(Theme.caveat(24))
                .foregroundStyle(Theme.Light.text)
            if collection.isSmart == true {
                Text("Lyrics tagged #\(collection.smartTag ?? "") will appear here.")
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.Light.muted)
                    .multilineTextAlignment(.center)
            } else {
                Text("Save lyrics to this collection from the bookmark button.")
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.Light.muted)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }
}

// MARK: - Collection Lyric Row

private struct CollectionLyricRow: View {
    let lyric: Lyric
    let isSmart: Bool
    var onRemove: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text(lyric.content)
                .font(Theme.caveat(22, weight: .medium))
                .foregroundStyle(Theme.Light.text)
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .leading)

            if lyric.songTitle != nil || lyric.artistName != nil {
                let parts = [lyric.songTitle, lyric.artistName].compactMap { $0 }
                Text(parts.joined(separator: " — "))
                    .font(Theme.dmSansItalic(13))
                    .foregroundStyle(Theme.Light.secondary)
                    .lineLimit(1)
            }

            HStack {
                if let tags = lyric.tags, !tags.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(tags.prefix(3), id: \.self) { tag in
                            Text("#\(tag)")
                                .font(Theme.dmSans(11))
                                .foregroundStyle(Theme.Light.muted)
                        }
                    }
                }

                Spacer()

                if !isSmart, let onRemove {
                    Button {
                        onRemove()
                    } label: {
                        Image(systemName: "minus.circle")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.Light.muted)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                }
            }
        }
        .padding(Theme.Spacing.md)
        .background(Theme.Light.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }
}

// MARK: - Collection Colors

enum CollectionColors {
    static func color(for name: String) -> Color {
        switch name.lowercased() {
        case "charcoal": Color(hex: "#4A4540")
        case "sage": Color(hex: "#8B9E7E")
        case "rust": Color(hex: "#B87356")
        case "slate": Color(hex: "#7A8B99")
        case "sand": Color(hex: "#C4B49A")
        case "lavender": Color(hex: "#9B8EC4")
        case "coral": Color(hex: "#D4756A")
        default: Color(hex: "#4A4540")
        }
    }

    static let all = ["charcoal", "sage", "rust", "slate", "sand", "lavender", "coral"]
}
