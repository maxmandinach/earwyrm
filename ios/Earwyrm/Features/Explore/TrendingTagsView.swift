import SwiftUI

struct TrendingTagsView: View {
    let tags: [TrendingTag]
    @Binding var selectedTags: Set<String>

    private var hasActiveFilter: Bool {
        !selectedTags.isEmpty
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.sm) {
                ForEach(tags) { tag in
                    let isSelected = selectedTags.contains(tag.tag)

                    Button {
                        if isSelected {
                            selectedTags.remove(tag.tag)
                        } else {
                            selectedTags.insert(tag.tag)
                        }
                        Haptics.light()
                    } label: {
                        HStack(spacing: 4) {
                            Text("#\(tag.tag)")
                                .font(Theme.dmSans(12))

                            if tag.count > 0 {
                                Text("\(tag.count)")
                                    .font(Theme.dmSans(10))
                                    .foregroundStyle(Theme.textPrimary.opacity(0.2))
                            }
                        }
                        .foregroundStyle(
                            isSelected
                                ? (hasActiveFilter
                                    ? Theme.textPrimary.opacity(0.7)
                                    : Theme.textPrimary.opacity(0.5))
                                : (hasActiveFilter
                                    ? Theme.textPrimary.opacity(0.3)
                                    : Theme.textPrimary.opacity(0.5))
                        )
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            Capsule()
                                .strokeBorder(
                                    isSelected && hasActiveFilter
                                        ? Theme.textPrimary.opacity(0.4)
                                        : Theme.textPrimary.opacity(0.1),
                                    lineWidth: 1
                                )
                                .background(
                                    isSelected && hasActiveFilter
                                        ? Capsule().fill(Theme.textPrimary.opacity(0.05))
                                        : Capsule().fill(Color.clear)
                                )
                        )
                    }
                }

                if hasActiveFilter {
                    Button {
                        selectedTags.removeAll()
                        Haptics.light()
                    } label: {
                        Text("clear")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.textPrimary.opacity(0.3))
                    }
                }
            }
        }
    }
}
