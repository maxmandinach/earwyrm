import SwiftUI
import UIKit

struct PostLyricView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = PostLyricViewModel()

    let currentLyricId: UUID?
    let onSaved: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                    // Lyric content editor
                    contentEditor

                    // Genius suggestion banner
                    if viewModel.shouldShowGenius {
                        GeniusSuggestionBanner(
                            suggestions: viewModel.geniusSuggestions,
                            isLoading: viewModel.isGeniusLoading,
                            onSelect: {
                                Haptics.light()
                                viewModel.selectGeniusSuggestion($0)
                            },
                            onDismiss: { viewModel.dismissGenius() }
                        )
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    // Suggest matches
                    if !viewModel.suggestMatches.isEmpty {
                        SuggestMatchesView(
                            matches: viewModel.suggestMatches,
                            selectedId: viewModel.selectedMatchId,
                            onSelect: {
                                Haptics.light()
                                viewModel.selectMatch($0)
                            }
                        )
                        .transition(.opacity)
                    }

                    // Artist + Song fields with cover art
                    metadataFields

                    // Note field
                    noteField

                    // Tags
                    TagInputView(tags: $viewModel.tags)

                    // Error
                    if let error = viewModel.saveError {
                        Text(error)
                            .font(Theme.dmSans(13))
                            .foregroundStyle(.red.opacity(0.8))
                            .padding(.horizontal, 4)
                    }

                    Spacer().frame(height: Theme.Spacing.xl)
                }
                .padding(.horizontal, Theme.Spacing.lg)
                .padding(.top, Theme.Spacing.md)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.Light.background)
            .navigationTitle("new lyric")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.cancelAllTasks()
                        dismiss()
                    }
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.Light.secondary)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        save()
                    } label: {
                        if viewModel.isSaving {
                            ProgressView()
                                .scaleEffect(0.8)
                                .tint(Theme.Light.accent)
                        } else {
                            Text("Save")
                                .font(Theme.dmSans(15, weight: .semibold))
                        }
                    }
                    .disabled(!viewModel.canSave)
                    .foregroundStyle(viewModel.canSave ? Theme.Light.accent : Theme.Light.muted)
                }
            }
            .toolbarBackground(Theme.Light.card, for: .navigationBar)
            .onDisappear {
                viewModel.cancelAllTasks()
            }
            .animation(.easeInOut(duration: 0.25), value: viewModel.shouldShowGenius)
            .animation(.easeInOut(duration: 0.2), value: viewModel.suggestMatches.isEmpty)
        }
    }

    // MARK: - Content Editor

    private var contentEditor: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("what's stuck in your head?")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.Light.muted)

            TextEditor(text: viewModel.isContentLocked
                       ? .constant(viewModel.content)
                       : $viewModel.content)
                .font(Theme.caveat(30))
                .foregroundStyle(Theme.Light.text)
                .lineSpacing(10)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 150)
                .padding(Theme.Spacing.md)
                .background(Theme.Light.card)
                .overlay(alignment: .topLeading) {
                    if let ghost = viewModel.ghostText, !ghost.isEmpty {
                        Text(viewModel.content + ghost)
                            .font(Theme.caveat(30))
                            .lineSpacing(10)
                            .foregroundStyle(.clear)
                            .overlay(alignment: .topLeading) {
                                // Re-render with styled attributed string
                                ghostTextView(typed: viewModel.content, ghost: ghost)
                            }
                            .padding(Theme.Spacing.md)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 8)
                            .allowsHitTesting(false)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
                .shadow(color: .black.opacity(0.06), radius: 16, y: 4)
                .opacity(viewModel.isContentLocked ? 0.7 : 1)
                .onKeyPress(.tab) {
                    if viewModel.acceptGhostText() {
                        return .handled
                    }
                    return .ignored
                }
                .onChange(of: viewModel.content) { _, _ in
                    viewModel.contentDidChange()
                }

            // Lyric soft guidance counter — fades in at 300 chars
            if viewModel.content.count >= 300 {
                let count = viewModel.content.count
                let counterColor: Color = count >= 500
                    ? .orange
                    : count >= 400
                        ? Theme.Light.accent
                        : Theme.Light.muted
                let counterOpacity: Double = count < 400
                    ? Double(count - 300) / 100.0
                    : 1.0
                Text("\(count) chars")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(counterColor)
                    .opacity(counterOpacity)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.trailing, 4)
                    .animation(.easeInOut(duration: 0.2), value: count)
            }

            if viewModel.ghostText != nil {
                Button {
                    Haptics.light()
                    viewModel.acceptGhostText()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.turn.down.left")
                            .font(.system(size: 11))
                        Text("tap to complete")
                            .font(Theme.dmSans(12))
                    }
                    .foregroundStyle(Theme.Light.muted)
                }
                .padding(.leading, 4)
            }

            if viewModel.isContentLocked {
                Button {
                    Haptics.light()
                    viewModel.selectMatch(nil)
                } label: {
                    Label("unlock & edit", systemImage: "lock.open")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.Light.accent)
                }
                .padding(.leading, 4)
            }
        }
    }

    // MARK: - Metadata Fields

    private var metadataFields: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack(alignment: .top, spacing: 12) {
                CoverArtPreview(url: viewModel.coverArtUrl)

                VStack(spacing: Theme.Spacing.sm) {
                    // Artist field
                    VStack(alignment: .leading, spacing: 0) {
                        CustomFocusTextField(
                            placeholder: "artist",
                            text: $viewModel.artistName,
                            onChange: { viewModel.artistFieldChanged() },
                            onFocusChange: { focused in
                                if !focused {
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                                        viewModel.showArtistAutocomplete = false
                                    }
                                }
                            }
                        )

                        if viewModel.showArtistAutocomplete
                            && (!viewModel.artistResults.isEmpty || viewModel.isArtistSearching) {
                            ArtistAutocompleteView(
                                artists: viewModel.artistResults,
                                isLoading: viewModel.isArtistSearching,
                                onSelect: {
                                    Haptics.light()
                                    viewModel.selectArtist($0)
                                }
                            )
                            .zIndex(10)
                        }
                    }

                    // Song field
                    VStack(alignment: .leading, spacing: 0) {
                        CustomFocusTextField(
                            placeholder: "song",
                            text: $viewModel.songTitle,
                            onChange: {
                                viewModel.songFieldChanged()
                                viewModel.triggerMatchSearchFromSong()
                            },
                            onFocusChange: { focused in
                                if !focused {
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                                        viewModel.showSongAutocomplete = false
                                    }
                                }
                            }
                        )

                        if viewModel.showSongAutocomplete
                            && (!viewModel.songResults.isEmpty || viewModel.isSongSearching) {
                            SongAutocompleteView(
                                recordings: viewModel.songResults,
                                isLoading: viewModel.isSongSearching,
                                onSelect: {
                                    Haptics.light()
                                    viewModel.selectRecording($0)
                                }
                            )
                            .zIndex(10)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Note Field

    private var noteField: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            if viewModel.showNoteField {
                VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                    TextEditor(text: $viewModel.noteContent)
                        .font(Theme.noteFont(16))
                        .foregroundStyle(Theme.Light.secondary)
                        .lineSpacing(6)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 60)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .overlay(alignment: .topLeading) {
                            if viewModel.noteContent.isEmpty {
                                Text("why does this one stay with you?")
                                    .font(Theme.noteFont(16))
                                    .foregroundStyle(Theme.Light.muted.opacity(0.5))
                                    .padding(.horizontal, 17)
                                    .padding(.vertical, 16)
                                    .allowsHitTesting(false)
                            }
                        }
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Theme.Light.divider, lineWidth: 1)
                        )
                        .onChange(of: viewModel.noteContent) { _, newValue in
                            if newValue.count > 500 {
                                viewModel.noteContent = String(newValue.prefix(500))
                            }
                        }

                    // Visibility toggle + note counter
                    HStack {
                        Button {
                            Haptics.light()
                            viewModel.noteIsPublic.toggle()
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: viewModel.noteIsPublic ? "eye" : "eye.slash")
                                    .font(.system(size: 11))
                                Text(viewModel.noteIsPublic ? "visible on explore" : "private note")
                                    .font(Theme.dmSans(12))
                            }
                            .foregroundStyle(Theme.Light.muted)
                            .padding(.leading, 4)
                        }

                        Spacer()

                        Text("\(viewModel.noteContent.count)/500")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(viewModel.noteContent.count > 450 ? Theme.Light.accent : Theme.Light.muted)
                            .padding(.trailing, 4)
                    }
                }
            } else {
                Button {
                    withAnimation(.easeOut(duration: 0.2)) {
                        viewModel.showNoteField = true
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "note.text")
                            .font(.system(size: 13))
                        Text("add a note")
                            .font(Theme.dmSans(13))
                    }
                    .foregroundStyle(Theme.Light.muted)
                }
            }
        }
    }

    // MARK: - Ghost Text Helper

    private func ghostTextView(typed: String, ghost: String) -> some View {
        Text(buildGhostAttributedString(typed: typed, ghost: ghost))
            .lineSpacing(10)
            .allowsHitTesting(false)
    }

    private func buildGhostAttributedString(typed: String, ghost: String) -> AttributedString {
        var typedPart = AttributedString(typed)
        typedPart.foregroundColor = .clear
        typedPart.font = Theme.caveat(30)

        var ghostPart = AttributedString(ghost)
        ghostPart.foregroundColor = Theme.Light.muted.opacity(0.35)
        ghostPart.font = Theme.caveat(30)

        return typedPart + ghostPart
    }

    // MARK: - Save

    private func save() {
        guard let userId = auth.userId else { return }
        let isPublic = auth.profile?.isPublic ?? false

        Task {
            let success = await viewModel.saveLyric(
                userId: userId,
                currentLyricId: currentLyricId,
                isPublicProfile: isPublic
            )
            if success {
                Haptics.success()
                onSaved()
                dismiss()
            } else {
                Haptics.error()
            }
        }
    }
}

// MARK: - Custom Focus TextField

struct CustomFocusTextField: View {
    let placeholder: String
    @Binding var text: String
    let onChange: () -> Void
    let onFocusChange: (Bool) -> Void
    @FocusState private var isFocused: Bool

    var body: some View {
        TextField(placeholder, text: $text)
            .font(Theme.dmSansItalic(14))
            .foregroundStyle(Theme.Light.text)
            .focused($isFocused)
            .autocorrectionDisabled()
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Theme.Light.background)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isFocused ? Theme.Light.accent.opacity(0.6) : Theme.Light.divider,
                            lineWidth: 1)
            )
            .onChange(of: text) { _, _ in
                onChange()
            }
            .onChange(of: isFocused) { _, focused in
                onFocusChange(focused)
            }
    }
}

// MARK: - Haptics

enum Haptics {
    static func light() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    static func medium() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
}
