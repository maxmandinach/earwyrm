import SwiftUI

struct TagInputView: View {
    @Binding var tags: [String]
    @State private var inputText = ""
    @State private var showSuggestions = false
    @FocusState private var isFocused: Bool

    private let defaultSuggestions = [
        "nostalgic", "stuck", "vibes", "mood", "throwback",
        "banger", "sad", "happy", "chill", "energy"
    ]

    private var filteredSuggestions: [String] {
        let query = inputText.lowercased().trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return [] }
        return defaultSuggestions
            .filter { $0.hasPrefix(query) && !tags.contains($0) }
            .prefix(4)
            .map { $0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("tags")
                .font(Theme.dmSans(13))
                .foregroundStyle(Theme.textMuted)

            // Tag chips
            if !tags.isEmpty {
                FlowLayout(spacing: 6) {
                    ForEach(tags, id: \.self) { tag in
                        tagChip(tag)
                    }
                }
            }

            // Input field
            HStack(spacing: 8) {
                TextField("add a tag...", text: $inputText)
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.textPrimary)
                    .focused($isFocused)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .onSubmit {
                        addTag()
                    }
                    .onChange(of: isFocused) { _, focused in
                        showSuggestions = focused && !inputText.isEmpty
                    }
                    .onChange(of: inputText) { _, newValue in
                        showSuggestions = !newValue.isEmpty && isFocused
                    }

                if !inputText.isEmpty {
                    Button {
                        addTag()
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(Theme.accent)
                            .font(.system(size: 20))
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Theme.background)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Theme.dividerColor, lineWidth: 1)
            )

            // Suggestions
            if showSuggestions && !filteredSuggestions.isEmpty {
                HStack(spacing: 6) {
                    ForEach(filteredSuggestions, id: \.self) { suggestion in
                        Button {
                            tags.append(suggestion)
                            inputText = ""
                            showSuggestions = false
                        } label: {
                            Text(suggestion)
                                .font(Theme.dmSans(12))
                                .foregroundStyle(Theme.textSecondary)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(Theme.background)
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule().stroke(Theme.dividerColor, lineWidth: 1)
                                )
                        }
                    }
                }
            }
        }
    }

    private func tagChip(_ tag: String) -> some View {
        HStack(spacing: 4) {
            Text(tag)
                .font(Theme.dmSans(13))
                .foregroundStyle(Theme.textPrimary)

            Button {
                tags.removeAll { $0 == tag }
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Theme.textMuted)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Theme.accent.opacity(0.15))
        .clipShape(Capsule())
    }

    private func addTag() {
        let tag = inputText.lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: " ", with: "-")
        guard !tag.isEmpty, !tags.contains(tag) else {
            inputText = ""
            return
        }
        tags.append(tag)
        inputText = ""
    }
}

// MARK: - Flow Layout for tag chips

struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: ProposedViewSize(result.sizes[index])
            )
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> ArrangementResult {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var sizes: [CGSize] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            sizes.append(size)
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return ArrangementResult(
            size: CGSize(width: maxWidth, height: y + rowHeight),
            positions: positions,
            sizes: sizes
        )
    }

    struct ArrangementResult {
        let size: CGSize
        let positions: [CGPoint]
        let sizes: [CGSize]
    }
}
