import SwiftUI
import UIKit

struct PostLyricView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(ToastManager.self) private var toastManager
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = PostLyricViewModel()
    @State private var artVM = ArtGalleryViewModel()
    @State private var savedLyric: Lyric?
    @State private var freeGenExhausted = false
    @State private var showPaywall = false
    @State private var showFreeGenSheet = false
    @State private var showRegenSheet = false
    @State private var showLyricBrowser = false

    let currentLyricId: UUID?
    let onSaved: () -> Void
    var prefillSongTitle: String? = nil
    var prefillArtistName: String? = nil
    var prefillCoverArtUrl: String? = nil

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

                    // Artist + Song — only after Genius confirms or user opts in
                    if viewModel.shouldShowMetadata {
                        metadataFields
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    } else if !viewModel.shouldShowGenius {
                        Button {
                            withAnimation(.easeOut(duration: 0.2)) {
                                viewModel.showManualMetadata = true
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "music.note")
                                    .font(.system(size: 13))
                                Text("add artist & song")
                                    .font(Theme.dmSans(13))
                            }
                            .foregroundStyle(Theme.textMuted)
                        }
                    }

                    // Browse full lyrics button
                    if viewModel.isMetadataConfirmed && viewModel.fullLyrics != nil {
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

                    // Note field
                    noteField

                    // Lyric visibility
                    Button {
                        Haptics.light()
                        let current = viewModel.lyricIsPublic ?? (auth.profile?.isPublic ?? false)
                        viewModel.lyricIsPublic = !current
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: (viewModel.lyricIsPublic ?? (auth.profile?.isPublic ?? false)) ? "globe" : "lock")
                                .font(.system(size: 11))
                            Text((viewModel.lyricIsPublic ?? (auth.profile?.isPublic ?? false)) ? "lyric is public" : "lyric is private")
                                .font(Theme.dmSans(12))
                        }
                        .foregroundStyle(Theme.textMuted)
                    }

                    // Art gallery
                    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                        ArtGalleryStrip(
                            viewModel: artVM,
                            onGenerate: { handleArtAction() },
                            isGenerating: artVM.isGeneratingArt,
                            isLocked: !subscriptionManager.isPlus && !artVM.hasAIArt && freeGenExhausted
                        )

                        if artVM.isGeneratingArt {
                            HStack(spacing: 8) {
                                ProgressView()
                                    .scaleEffect(0.7)
                                    .tint(Theme.accent)
                                Text("generating artwork...")
                                    .font(Theme.dmSans(12))
                                    .foregroundStyle(Theme.textSecondary)
                            }
                        }

                        if let error = artVM.aiArtError {
                            Text(error)
                                .font(Theme.dmSans(12))
                                .foregroundStyle(.red.opacity(0.7))
                        }
                    }

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
            .background(Theme.background)
            .navigationTitle("new lyric")
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
                    Button("Cancel") {
                        viewModel.cancelAllTasks()
                        dismiss()
                    }
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.textSecondary)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        save()
                    } label: {
                        if viewModel.isSaving {
                            ProgressView()
                                .scaleEffect(0.8)
                                .tint(Theme.accent)
                        } else {
                            Text("Save")
                                .font(Theme.dmSans(15, weight: .semibold))
                        }
                    }
                    .disabled(!viewModel.canSave)
                    .foregroundStyle(viewModel.canSave ? Theme.accent : Theme.textMuted)
                }
            }
            .toolbarBackground(Theme.card, for: .navigationBar)
            .onAppear {
                viewModel.toast = toastManager
                if let song = prefillSongTitle, let artist = prefillArtistName {
                    viewModel.prefill(songTitle: song, artistName: artist, coverArtUrl: prefillCoverArtUrl)
                }
                Analytics.track(.postLyricStarted)
            }
            .onDisappear {
                viewModel.cancelAllTasks()
            }
            .animation(.easeInOut(duration: 0.25), value: viewModel.shouldShowGenius)
            .animation(.easeInOut(duration: 0.2), value: viewModel.suggestMatches.isEmpty)
            .animation(.easeOut(duration: 0.25), value: viewModel.shouldShowMetadata)
            .sheet(isPresented: $showLyricBrowser) {
                if let lyrics = viewModel.fullLyrics {
                    LyricBrowserView(lyrics: lyrics, currentContent: viewModel.content) { selectedText in
                        viewModel.content = selectedText
                        viewModel.isContentLocked = true
                        showLyricBrowser = false
                    }
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
                }
            }
            .onChange(of: viewModel.coverArtUrl) { _, newUrl in
                Task {
                    if let urlStr = newUrl, let url = URL(string: urlStr) {
                        artVM.coverArtUrl = urlStr
                        artVM.coverArtImage = await CardArtService.downloadImage(from: url)
                        artVM.selectedStyle = .coverArt
                    } else {
                        artVM.coverArtUrl = nil
                        artVM.coverArtImage = nil
                        if artVM.selectedStyle == .coverArt { artVM.selectedStyle = .none }
                    }
                }
            }
            .onChange(of: artVM.needsUpgrade) { _, needsUpgrade in
                if needsUpgrade {
                    freeGenExhausted = true
                    Analytics.track(.aiArtPaywallHit)
                    showPaywall = true
                    artVM.needsUpgrade = false
                }
            }
            .sheet(isPresented: $showPaywall) {
                EarwyrmPlusPaywall(context: "ai_art")
                    .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showFreeGenSheet) {
                ArtGenerationSheet(
                    mode: .firstGen,
                    existingNote: viewModel.noteContent.isEmpty ? nil : viewModel.noteContent,
                    artRemaining: artVM.artRemaining,
                    onGenerate: { note, refinement in
                        performGenerate(note: note, refinement: refinement)
                    },
                    onShowPaywall: { showPaywall = true }
                )
                .presentationDetents([.height(viewModel.noteContent.isEmpty ? 370 : 220)])
                .presentationDragIndicator(.visible)
                .presentationBackground(Theme.background)
            }
            .sheet(isPresented: $showRegenSheet) {
                ArtGenerationSheet(
                    mode: .regen,
                    existingNote: viewModel.noteContent.isEmpty ? nil : viewModel.noteContent,
                    artRemaining: artVM.artRemaining,
                    onGenerate: { note, refinement in
                        performGenerate(note: note, refinement: refinement)
                    },
                    onShowPaywall: { showPaywall = true }
                )
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
                .presentationBackground(Theme.background)
            }
        }
    }

    // MARK: - Content Editor

    private var contentEditor: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("what's stuck in your head?")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.textMuted)

            TextEditor(text: viewModel.isContentLocked
                       ? .constant(viewModel.content)
                       : $viewModel.content)
                .font(Theme.caveat(30))
                .foregroundStyle(Theme.textPrimary)
                .lineSpacing(10)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 150, maxHeight: 400)
                .fixedSize(horizontal: false, vertical: true)
                .padding(Theme.Spacing.md)
                .background(Theme.card)
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
                .onChange(of: viewModel.content) { _, newValue in
                    if newValue.count > 500 {
                        viewModel.content = String(newValue.prefix(500))
                    }
                    viewModel.contentDidChange()
                }

            // Lyric character counter
            if viewModel.content.count >= 400 {
                Text("\(viewModel.content.count)/500")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(viewModel.content.count >= 500 ? .orange : Theme.accent)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.trailing, 4)
                    .animation(.easeInOut(duration: 0.2), value: viewModel.content.count)
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
                    .foregroundStyle(Theme.textMuted)
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
                        .foregroundStyle(Theme.accent)
                }
                .padding(.leading, 4)
            }
        }
    }

    // MARK: - Metadata Fields

    private var metadataFields: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            if viewModel.isMetadataConfirmed {
                confirmedMetadataPill
            } else {
                editableMetadataFields
            }
        }
    }

    private var confirmedMetadataPill: some View {
        HStack(spacing: 12) {
            CoverArtPreview(url: viewModel.coverArtUrl)

            VStack(alignment: .leading, spacing: 2) {
                Text(viewModel.songTitle)
                    .font(Theme.dmSans(15, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
                Text(viewModel.artistName)
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(1)
            }

            Spacer()

            Button {
                Haptics.light()
                viewModel.editMetadata()
            } label: {
                Image(systemName: "pencil")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.textMuted)
            }
        }
        .padding(12)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var editableMetadataFields: some View {
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

    // MARK: - Note Field

    private var noteField: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            if viewModel.showNoteField {
                VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                    TextEditor(text: $viewModel.noteContent)
                        .font(Theme.noteFont(16))
                        .foregroundStyle(Theme.textSecondary)
                        .lineSpacing(6)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 60)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .overlay(alignment: .topLeading) {
                            if viewModel.noteContent.isEmpty {
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
                                Text(viewModel.noteIsPublic ? "note visible to others" : "note is private")
                                    .font(Theme.dmSans(12))
                            }
                            .foregroundStyle(Theme.textMuted)
                            .padding(.leading, 4)
                        }

                        Spacer()

                        Text("\(viewModel.noteContent.count)/500")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(viewModel.noteContent.count > 450 ? Theme.accent : Theme.textMuted)
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
                    .foregroundStyle(Theme.textMuted)
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
        ghostPart.foregroundColor = Theme.textMuted.opacity(0.35)
        ghostPart.font = Theme.caveat(30)

        return typedPart + ghostPart
    }

    // MARK: - Save

    private func save() {
        guard let userId = auth.userId else { return }
        let isPublic = auth.profile?.isPublic ?? false

        Task {
            if savedLyric != nil {
                // Already silently saved (via art generation) — persist art choice and dismiss
                if let lyric = savedLyric {
                    await artVM.persistActiveVariant(lyricId: lyric.id)
                }
                Analytics.track(.postLyricCompleted)
                Haptics.success()
                onSaved()
                dismiss()
            } else {
                let lyric = await viewModel.saveLyric(
                    userId: userId,
                    currentLyricId: currentLyricId,
                    isPublicProfile: isPublic
                )
                if let lyric {
                    savedLyric = lyric
                    await artVM.persistActiveVariant(lyricId: lyric.id)
                    Analytics.track(.postLyricCompleted)
                    Haptics.success()
                    onSaved()
                    dismiss()
                } else {
                    Haptics.error()
                }
            }
        }
    }

    // MARK: - Art Generation

    private func handleArtAction() {
        guard let userId = auth.userId else { return }

        Task {
            // Silent save if not yet saved
            if savedLyric == nil {
                let isPublic = auth.profile?.isPublic ?? false
                let lyric = await viewModel.saveLyric(
                    userId: userId,
                    currentLyricId: currentLyricId,
                    isPublicProfile: isPublic
                )
                guard let lyric else {
                    Haptics.error()
                    return
                }
                savedLyric = lyric
            }

            let action = artVM.resolveAction(isPlus: subscriptionManager.isPlus, freeGenExhausted: freeGenExhausted)
            switch action {
            case .generate:
                performGenerate(note: viewModel.noteContent.isEmpty ? nil : viewModel.noteContent, refinement: nil)
            case .showFreeGenSheet:
                showFreeGenSheet = true
            case .showRegenSheet:
                showRegenSheet = true
            case .showPaywall:
                Analytics.track(.aiArtPaywallHit)
                showPaywall = true
            }
        }
    }

    private func performGenerate(note: String?, refinement: String?) {
        guard let lyric = savedLyric else { return }
        if artVM.hasAIArt {
            Analytics.track(.aiArtRegenerated)
        }
        // Sync note from art gen sheet back to viewModel so it saves with the lyric
        if let note, !note.isEmpty {
            viewModel.noteContent = note
            viewModel.showNoteField = true
        }
        Task {
            await artVM.generate(lyric: lyric, note: note, refinement: refinement)
            if artVM.wasFreeTierGen {
                freeGenExhausted = true
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
            .foregroundStyle(Theme.textPrimary)
            .focused($isFocused)
            .autocorrectionDisabled()
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Theme.background)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isFocused ? Theme.accent.opacity(0.6) : Theme.dividerColor,
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

