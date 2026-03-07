import SwiftUI
import Supabase

struct EditLyricView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthManager.self) private var auth
    let lyric: Lyric
    let onSaved: () -> Void

    @State private var content: String
    @State private var songTitle: String
    @State private var artistName: String
    @State private var noteContent: String = ""
    @State private var noteIsPublic: Bool = false
    @State private var showNoteField: Bool = false
    @State private var existingNote: LyricNote?
    @State private var isSaving = false
    @State private var error: String?
    @State private var showLyricBrowser = false
    @State private var fullLyrics: String?
    @State private var lyricIsPublic: Bool

    // Artwork — shared view model
    @State private var artVM = ArtGalleryViewModel()

    init(lyric: Lyric, onSaved: @escaping () -> Void) {
        self.lyric = lyric
        self.onSaved = onSaved
        _content = State(initialValue: lyric.content)
        _songTitle = State(initialValue: lyric.songTitle ?? "")
        _artistName = State(initialValue: lyric.artistName ?? "")
        _lyricIsPublic = State(initialValue: lyric.isPublic ?? false)
    }

    private var canSave: Bool {
        !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSaving
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                    // Content — shows AI art background as live preview
                    TextEditor(text: $content)
                        .font(Theme.caveat(30))
                        .foregroundStyle(Theme.textPrimary)
                        .lineSpacing(10)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 150, maxHeight: 400)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(Theme.Spacing.md)
                        .background(
                            ZStack {
                                Theme.card
                                if let image = artVM.activeImage {
                                    Image(uiImage: image)
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .opacity(0.2)
                                        .overlay(
                                            LinearGradient(
                                                colors: [Theme.card.opacity(0.2), Theme.card.opacity(0.9)],
                                                startPoint: .top,
                                                endPoint: .bottom
                                            )
                                        )
                                }
                            }
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
                        .shadow(color: .black.opacity(0.06), radius: 16, y: 4)
                        .animation(.easeInOut(duration: 0.2), value: artVM.selectedStyle)
                        .onChange(of: content) { _, newValue in
                            if newValue.count > 500 {
                                content = String(newValue.prefix(500))
                            }
                        }

                    // Lyric character counter
                    if content.count >= 400 {
                        Text("\(content.count)/500")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(content.count >= 500 ? .orange : Theme.accent)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                            .padding(.trailing, 4)
                            .animation(.easeInOut(duration: 0.2), value: content.count)
                    }

                    // Lyric visibility
                    Button {
                        Haptics.light()
                        lyricIsPublic.toggle()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: lyricIsPublic ? "globe" : "lock")
                                .font(.system(size: 11))
                            Text(lyricIsPublic ? "lyric is public" : "lyric is private")
                                .font(Theme.dmSans(12))
                        }
                        .foregroundStyle(Theme.textMuted)
                    }

                    // Song + Artist
                    VStack(spacing: Theme.Spacing.sm) {
                        editField("song", text: $songTitle)
                        editField("artist", text: $artistName)
                    }

                    // Browse full lyrics
                    if fullLyrics != nil {
                        Button {
                            showLyricBrowser = true
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "text.page")
                                    .font(.system(size: 13))
                                Text("browse full lyrics")
                                    .font(Theme.dmSans(13))
                            }
                            .foregroundStyle(Theme.accent)
                        }
                    }

                    // Note
                    noteSection

                    // Artwork — unified component
                    ArtworkSectionView(
                        lyric: lyric,
                        noteContent: noteContent,
                        viewModel: artVM
                    )

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
            .background(Theme.background)
            .navigationTitle("edit lyric")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                    .font(Theme.dmSans(15, weight: .medium))
                    .foregroundStyle(Theme.accent)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.textSecondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button { save() } label: {
                        if isSaving {
                            ProgressView().scaleEffect(0.8).tint(Theme.accent)
                        } else {
                            Text("Save")
                                .font(Theme.dmSans(15, weight: .semibold))
                        }
                    }
                    .disabled(!canSave)
                    .foregroundStyle(canSave ? Theme.accent : Theme.textMuted)
                }
            }
            .toolbarBackground(Theme.card, for: .navigationBar)
            .task {
                await loadNote()
                await fetchLyrics()
                await artVM.loadVariants(for: lyric)
            }
            .onDisappear {
                // Persist art selection if changed
                Task {
                    await artVM.persistActiveVariant(lyricId: lyric.id)
                }
            }
            .sheet(isPresented: $showLyricBrowser) {
                if let lyrics = fullLyrics {
                    LyricBrowserView(lyrics: lyrics, currentContent: content) { selectedText in
                        content = selectedText
                        showLyricBrowser = false
                    }
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
                }
            }
        }
    }

    // MARK: - Note Section

    private var noteSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            if showNoteField {
                VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                    TextEditor(text: $noteContent)
                        .font(Theme.noteFont(16))
                        .foregroundStyle(Theme.textSecondary)
                        .lineSpacing(6)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 60)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .overlay(alignment: .topLeading) {
                            if noteContent.isEmpty {
                                Text("why does this one stay with you?")
                                    .font(Theme.noteFont(16))
                                    .foregroundStyle(Theme.textMuted.opacity(0.5))
                                    .padding(.horizontal, 17)
                                    .padding(.vertical, 16)
                                    .allowsHitTesting(false)
                            }
                        }
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Theme.dividerColor, lineWidth: 1)
                        )
                        .onChange(of: noteContent) { _, newValue in
                            if newValue.count > 500 {
                                noteContent = String(newValue.prefix(500))
                            }
                        }

                    // Visibility toggle + note counter
                    HStack {
                        Button {
                            Haptics.light()
                            noteIsPublic.toggle()
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: noteIsPublic ? "eye" : "eye.slash")
                                    .font(.system(size: 11))
                                Text(noteIsPublic ? "note visible to others" : "note is private")
                                    .font(Theme.dmSans(12))
                            }
                            .foregroundStyle(Theme.textMuted)
                            .padding(.leading, 4)
                        }

                        Spacer()

                        Text("\(noteContent.count)/500")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(noteContent.count > 450 ? Theme.accent : Theme.textMuted)
                            .padding(.trailing, 4)
                    }
                }
            } else {
                Button {
                    withAnimation(.easeOut(duration: 0.2)) {
                        showNoteField = true
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "note.text")
                            .font(.system(size: 13))
                        Text("add a note")
                            .font(Theme.dmSans(13))
                    }
                    .foregroundStyle(Theme.textMuted)
                }
            }
        }
    }

    private func loadNote() async {
        guard let userId = auth.userId else { return }
        do {
            let notes: [LyricNote] = try await supabase
                .from("lyric_notes")
                .select("id, lyric_id, user_id, content, is_public, created_at, updated_at")
                .eq("lyric_id", value: lyric.id.uuidString)
                .eq("user_id", value: userId.uuidString)
                .limit(1)
                .execute()
                .value

            if let note = notes.first {
                existingNote = note
                noteContent = note.content
                noteIsPublic = note.isPublic ?? false
                showNoteField = true
            }
        } catch {
            print("Load note error: \(error)")
        }
    }

    private func fetchLyrics() async {
        let artist = artistName.trimmingCharacters(in: .whitespaces)
        let song = songTitle.trimmingCharacters(in: .whitespaces)
        guard !artist.isEmpty, !song.isEmpty else { return }
        fullLyrics = await SongLyricsService.fetchLyrics(songTitle: song, artistName: artist)
    }

    private func editField(_ placeholder: String, text: Binding<String>) -> some View {
        TextField(placeholder, text: text)
            .font(Theme.dmSansItalic(14))
            .foregroundStyle(Theme.textPrimary)
            .autocorrectionDisabled()
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Theme.background)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Theme.dividerColor, lineWidth: 1)
            )
    }

    private func save() {
        isSaving = true
        error = nil

        let trimmedContent = content.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedSong = songTitle.trimmingCharacters(in: .whitespaces)
        let trimmedArtist = artistName.trimmingCharacters(in: .whitespaces)
        let trimmedNote = noteContent.trimmingCharacters(in: .whitespacesAndNewlines)

        Task {
            do {
                let update = LyricEditUpdate(
                    content: trimmedContent,
                    songTitle: trimmedSong.isEmpty ? nil : trimmedSong,
                    artistName: trimmedArtist.isEmpty ? nil : trimmedArtist,
                    isPublic: lyricIsPublic
                )
                try await supabase
                    .from("lyrics")
                    .update(update)
                    .eq("id", value: lyric.id.uuidString)
                    .execute()

                // Save note if content exists
                if !trimmedNote.isEmpty, let userId = auth.userId {
                    if let existing = existingNote {
                        let noteUpdate = NoteContentUpdate(content: trimmedNote, isPublic: noteIsPublic)
                        try await supabase
                            .from("lyric_notes")
                            .update(noteUpdate)
                            .eq("id", value: existing.id.uuidString)
                            .execute()
                    } else {
                        let insert = NoteInsert(
                            lyricId: lyric.id,
                            userId: userId,
                            content: trimmedNote,
                            isPublic: noteIsPublic
                        )
                        try await supabase
                            .from("lyric_notes")
                            .insert(insert)
                            .execute()
                    }
                }

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

private struct NoteContentUpdate: Encodable {
    let content: String
    let isPublic: Bool

    enum CodingKeys: String, CodingKey {
        case content
        case isPublic = "is_public"
    }
}

struct LyricEditUpdate: Encodable {
    let content: String
    let songTitle: String?
    let artistName: String?
    let isPublic: Bool

    enum CodingKeys: String, CodingKey {
        case content
        case songTitle = "song_title"
        case artistName = "artist_name"
        case isPublic = "is_public"
    }
}
