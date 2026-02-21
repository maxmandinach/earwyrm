import SwiftUI
import Supabase

struct EditLyricView: View {
    @Environment(\.dismiss) private var dismiss
    let lyric: Lyric
    let onSaved: () -> Void

    @State private var content: String
    @State private var songTitle: String
    @State private var artistName: String
    @State private var isSaving = false
    @State private var error: String?

    init(lyric: Lyric, onSaved: @escaping () -> Void) {
        self.lyric = lyric
        self.onSaved = onSaved
        _content = State(initialValue: lyric.content)
        _songTitle = State(initialValue: lyric.songTitle ?? "")
        _artistName = State(initialValue: lyric.artistName ?? "")
    }

    private var canSave: Bool {
        !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSaving
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                    // Content
                    TextEditor(text: $content)
                        .font(Theme.caveat(30))
                        .foregroundStyle(Theme.Light.text)
                        .lineSpacing(10)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 150)
                        .padding(Theme.Spacing.md)
                        .background(Theme.Light.card)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
                        .shadow(color: .black.opacity(0.06), radius: 16, y: 4)

                    // Song + Artist
                    VStack(spacing: Theme.Spacing.sm) {
                        editField("song", text: $songTitle)
                        editField("artist", text: $artistName)
                    }

                    if let error {
                        Text(error)
                            .font(Theme.dmSans(13))
                            .foregroundStyle(.red.opacity(0.8))
                    }
                }
                .padding(.horizontal, Theme.Spacing.lg)
                .padding(.top, Theme.Spacing.md)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.Light.background)
            .navigationTitle("edit lyric")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.Light.secondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button { save() } label: {
                        if isSaving {
                            ProgressView().scaleEffect(0.8).tint(Theme.Light.accent)
                        } else {
                            Text("Save")
                                .font(Theme.dmSans(15, weight: .semibold))
                        }
                    }
                    .disabled(!canSave)
                    .foregroundStyle(canSave ? Theme.Light.accent : Theme.Light.muted)
                }
            }
            .toolbarBackground(Theme.Light.card, for: .navigationBar)
        }
    }

    private func editField(_ placeholder: String, text: Binding<String>) -> some View {
        TextField(placeholder, text: text)
            .font(Theme.dmSansItalic(14))
            .foregroundStyle(Theme.Light.text)
            .autocorrectionDisabled()
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Theme.Light.background)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Theme.Light.divider, lineWidth: 1)
            )
    }

    private func save() {
        isSaving = true
        error = nil

        let trimmedContent = content.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedSong = songTitle.trimmingCharacters(in: .whitespaces)
        let trimmedArtist = artistName.trimmingCharacters(in: .whitespaces)

        Task {
            do {
                let update = LyricEditUpdate(
                    content: trimmedContent,
                    songTitle: trimmedSong.isEmpty ? nil : trimmedSong,
                    artistName: trimmedArtist.isEmpty ? nil : trimmedArtist
                )
                try await supabase
                    .from("lyrics")
                    .update(update)
                    .eq("id", value: lyric.id.uuidString)
                    .execute()

                Haptics.success()
                onSaved()
                dismiss()
            } catch {
                self.error = error.localizedDescription
                Haptics.error()
                isSaving = false
            }
        }
    }
}

struct LyricEditUpdate: Encodable {
    let content: String
    let songTitle: String?
    let artistName: String?

    enum CodingKeys: String, CodingKey {
        case content
        case songTitle = "song_title"
        case artistName = "artist_name"
    }
}
