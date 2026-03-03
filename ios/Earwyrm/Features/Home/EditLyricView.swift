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

    // Artwork
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @State private var artImage: UIImage?
    @State private var isGeneratingArt = false
    @State private var artRemaining: Int?
    @State private var artError: String?
    @State private var showArtPaywall = false

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
                        .foregroundStyle(Theme.textPrimary)
                        .lineSpacing(10)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 150)
                        .padding(Theme.Spacing.md)
                        .background(Theme.card)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
                        .shadow(color: .black.opacity(0.06), radius: 16, y: 4)
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

                    // Artwork
                    artworkSection

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
                await loadArtwork()
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

    // MARK: - Artwork Section

    private var artworkSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            if let artImage {
                // Show existing artwork thumbnail
                HStack(spacing: Theme.Spacing.md) {
                    Image(uiImage: artImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 64, height: 64)
                        .clipShape(RoundedRectangle(cornerRadius: 8))

                    VStack(alignment: .leading, spacing: 4) {
                        Text("lyric artwork")
                            .font(Theme.dmSans(13, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)

                        HStack(spacing: Theme.Spacing.sm) {
                            Button {
                                generateArt()
                            } label: {
                                Text(artRemainingLabel("Regenerate"))
                                    .font(Theme.dmSans(12))
                                    .foregroundStyle(Theme.accent)
                            }
                            .disabled(isGeneratingArt)

                            Button {
                                deleteArt()
                            } label: {
                                Text("Delete")
                                    .font(Theme.dmSans(12))
                                    .foregroundStyle(.red.opacity(0.7))
                            }
                        }
                    }
                }
            } else {
                // No artwork — show generate button
                Button {
                    if subscriptionManager.isPlus {
                        generateArt()
                    } else {
                        showArtPaywall = true
                    }
                } label: {
                    HStack(spacing: 6) {
                        if isGeneratingArt {
                            ProgressView()
                                .scaleEffect(0.7)
                                .tint(Theme.accent)
                        } else {
                            Image(systemName: "wand.and.stars")
                                .font(.system(size: 13))
                        }
                        Text(isGeneratingArt ? "Generating..." : artRemainingLabel("Generate artwork"))
                            .font(Theme.dmSans(13))
                    }
                    .foregroundStyle(Theme.accent)
                }
                .disabled(isGeneratingArt)
            }

            if let artError {
                Text(artError)
                    .font(Theme.dmSans(12))
                    .foregroundStyle(.red.opacity(0.7))
            }
        }
        .sheet(isPresented: $showArtPaywall) {
            EarwyrmPlusPaywall()
                .presentationDragIndicator(.visible)
        }
    }

    private func artRemainingLabel(_ prefix: String) -> String {
        if let remaining = artRemaining {
            return remaining > 0 ? "\(prefix) (\(remaining) remaining)" : "Daily limit reached"
        }
        return prefix
    }

    private func generateArt() {
        isGeneratingArt = true
        artError = nil

        Task {
            do {
                let result = try await CardArtService.generateArt(lyric: lyric, note: noteContent.isEmpty ? nil : noteContent)
                artRemaining = result.remaining
                artImage = await CardArtService.downloadImage(from: result.url)
                Analytics.track(.aiArtGenerated)
            } catch {
                artError = error.localizedDescription
            }
            isGeneratingArt = false
        }
    }

    private func deleteArt() {
        Task {
            do {
                // Delete from storage
                let path = "\(lyric.id.uuidString).png"
                try await supabase.storage.from("card-art").remove(paths: [path])

                // Clear URL from lyric
                try await supabase
                    .from("lyrics")
                    .update(["card_art_url": nil] as [String: String?])
                    .eq("id", value: lyric.id.uuidString)
                    .execute()

                artImage = nil
                Haptics.light()
            } catch {
                artError = "Failed to delete artwork"
                print("Delete art error: \(error)")
            }
        }
    }

    private func loadArtwork() async {
        guard let urlString = lyric.cardArtUrl else { return }
        artImage = await CardArtService.downloadImage(from: URL(string: urlString)!)
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
                                Text(noteIsPublic ? "visible on explore" : "private note")
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
                    artistName: trimmedArtist.isEmpty ? nil : trimmedArtist
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

    enum CodingKeys: String, CodingKey {
        case content
        case songTitle = "song_title"
        case artistName = "artist_name"
    }
}
