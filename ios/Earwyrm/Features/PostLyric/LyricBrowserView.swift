import SwiftUI

struct LyricBrowserView: View {
    let lyrics: String
    let onSelect: (String) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var startLine: Int?
    @State private var endLine: Int?

    private var lines: [String] {
        lyrics.components(separatedBy: "\n")
    }

    private var selectedRange: ClosedRange<Int>? {
        guard let start = startLine else { return nil }
        guard let end = endLine else { return start...start }
        let lo = min(start, end)
        let hi = max(start, end)
        return lo...hi
    }

    private var selectedText: String {
        guard let range = selectedRange else { return "" }
        return lines[range]
            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
            .joined(separator: "\n")
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                            let isEmpty = line.trimmingCharacters(in: .whitespaces).isEmpty
                            let isSelected = selectedRange?.contains(index) ?? false

                            if isEmpty {
                                Spacer().frame(height: 16)
                            } else {
                                Button {
                                    handleLineTap(index)
                                    Haptics.light()
                                } label: {
                                    Text(line)
                                        .font(Theme.caveat(18))
                                        .foregroundStyle(isSelected ? Theme.textPrimary : Theme.textSecondary)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, 4)
                                        .padding(.horizontal, 8)
                                        .background(
                                            isSelected
                                                ? Theme.accent.opacity(0.15)
                                                : Color.clear
                                        )
                                        .overlay(alignment: .leading) {
                                            if isSelected {
                                                Rectangle()
                                                    .fill(Theme.accent)
                                                    .frame(width: 2)
                                            }
                                        }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.top, Theme.Spacing.md)
                    .padding(.bottom, 100)
                }

                // Selection toolbar
                if startLine != nil {
                    VStack(spacing: Theme.Spacing.sm) {
                        if !selectedText.isEmpty {
                            Text(selectedText)
                                .font(Theme.caveat(14))
                                .foregroundStyle(Theme.textSecondary)
                                .lineLimit(2)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        HStack(spacing: Theme.Spacing.md) {
                            Button {
                                startLine = nil
                                endLine = nil
                                Haptics.light()
                            } label: {
                                Text("Clear")
                                    .font(Theme.dmSans(14))
                                    .foregroundStyle(Theme.textSecondary)
                            }

                            Spacer()

                            Button {
                                let text = selectedText
                                guard !text.isEmpty else { return }
                                onSelect(text)
                                Haptics.success()
                                dismiss()
                            } label: {
                                Text("Use selected")
                                    .font(Theme.dmSans(14, weight: .medium))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, Theme.Spacing.lg)
                                    .padding(.vertical, Theme.Spacing.sm)
                                    .background(Theme.accent)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.vertical, Theme.Spacing.md)
                    .background(
                        Theme.card
                            .shadow(color: .black.opacity(0.08), radius: 8, y: -2)
                    )
                }
            }
            .background(Theme.background)
            .navigationTitle("browse lyrics")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
    }

    private func handleLineTap(_ index: Int) {
        if startLine == nil {
            startLine = index
            endLine = nil
        } else if endLine == nil {
            endLine = index
        } else {
            // Reset: start new selection
            startLine = index
            endLine = nil
        }
    }
}
