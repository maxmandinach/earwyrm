import SwiftUI
import UIKit

struct NoteEditorSheet: View {
    let lyricId: UUID
    let userId: UUID
    @Bindable var viewModel: HomeViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var text = ""
    @State private var isPublic = false
    @State private var hasLoaded = false

    private static let prompts = [
        "why does this lyric stick with you?",
        "what were you doing when this came on?",
        "what memory does this bring back?",
        "how does this lyric make you feel?",
        "what moment does this remind you of?",
    ]

    @State private var placeholder = prompts.randomElement() ?? "add a note..."

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Theme.Spacing.md) {
                ZStack(alignment: .topLeading) {
                    if text.isEmpty {
                        Text(placeholder)
                            .font(Theme.noteFont(18))
                            .foregroundStyle(Theme.Light.muted)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 8)
                    }

                    TextEditor(text: $text)
                        .font(Theme.noteFont(18))
                        .foregroundStyle(Theme.Light.text)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 100)
                        .onChange(of: text) { _, newValue in
                            if newValue.count > 500 {
                                text = String(newValue.prefix(500))
                            }
                        }
                }

                HStack {
                    Text("\(text.count)/500")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.Light.muted)

                    Spacer()

                    Button {
                        isPublic.toggle()
                        Haptics.light()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: isPublic ? "eye" : "eye.slash")
                                .font(.system(size: 11))
                            Text(isPublic ? "public" : "private")
                                .font(Theme.dmSans(12, weight: .medium))
                        }
                        .foregroundStyle(isPublic ? Theme.Light.accent : Theme.Light.muted)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(
                            Capsule()
                                .fill(isPublic ? Theme.Light.accent.opacity(0.12) : Theme.Light.card)
                        )
                        .overlay(
                            Capsule()
                                .strokeBorder(Theme.Light.divider, lineWidth: isPublic ? 0 : 1)
                        )
                    }
                }

                Spacer()
            }
            .padding(Theme.Spacing.lg)
            .background(Theme.Light.background)
            .navigationTitle("note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                    .font(Theme.dmSans(15, weight: .medium))
                    .foregroundStyle(Theme.Light.accent)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.Light.secondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Haptics.success()
                        save()
                        dismiss()
                    }
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(Theme.Light.accent)
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .task {
            guard !hasLoaded else { return }
            hasLoaded = true
            await viewModel.fetchNote(lyricId: lyricId, userId: userId)
            if let note = viewModel.currentNote {
                text = note.content
                isPublic = note.isPublic ?? false
            }
        }
    }

    private func save() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        Task {
            await viewModel.saveNote(
                lyricId: lyricId,
                userId: userId,
                content: trimmed,
                isPublic: isPublic
            )
        }
    }
}
