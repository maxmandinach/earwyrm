import SwiftUI

struct LyricBrowserView: View {
    let lyrics: String
    let currentContent: String
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

    private var instructionText: String {
        if startLine == nil {
            return "tap a line to start selecting"
        } else if endLine == nil {
            return "tap another line to complete your selection"
        } else {
            return "tap a line to adjust · clear to start over"
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Instruction bar
                Text(instructionText)
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.textMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Theme.card)

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
            .onAppear {
                restoreSelectionFromContent()
            }
        }
    }

    private func handleLineTap(_ index: Int) {
        if startLine == nil {
            // First tap: set start
            startLine = index
            endLine = nil
        } else if endLine == nil {
            // Second tap: set end
            endLine = index
        } else {
            // Already have a range — adjust nearest endpoint
            guard let start = startLine, let end = endLine else { return }
            let lo = min(start, end)
            let hi = max(start, end)
            let mid = (lo + hi) / 2

            if index <= mid {
                startLine = min(index, hi)
                endLine = max(index, hi)
            } else {
                startLine = lo
                endLine = index
            }
        }
    }

    /// If content already has text from a previous selection, find and highlight those lines.
    private func restoreSelectionFromContent() {
        let trimmed = currentContent.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let contentLines = trimmed.components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        guard let firstContent = contentLines.first,
              let lastContent = contentLines.last else { return }

        let normalizedFirst = normalize(firstContent)
        let normalizedLast = normalize(lastContent)

        var foundStart: Int?
        var foundEnd: Int?

        for (index, line) in lines.enumerated() {
            let normalizedLine = normalize(line)
            guard normalizedLine.count >= 3 else { continue }

            if foundStart == nil && normalizedLine.contains(normalizedFirst) {
                foundStart = index
            }
            if normalizedLine.contains(normalizedLast) {
                foundEnd = index
            }
        }

        if let s = foundStart, let e = foundEnd {
            startLine = s
            endLine = e
        }
    }

    private func normalize(_ text: String) -> String {
        text.lowercased()
            .replacingOccurrences(of: "[^a-z0-9\\s]", with: "", options: .regularExpression)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespaces)
    }
}
