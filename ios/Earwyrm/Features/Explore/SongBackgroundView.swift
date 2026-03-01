import SwiftUI
import Supabase

struct SongBackgroundView: View {
    let songTitle: String
    let artistName: String?

    @Environment(AuthManager.self) private var auth
    @Environment(AuthGate.self) private var authGate
    @Environment(ToastManager.self) private var toastManager

    @State private var background: SongBackground?
    @State private var authorUsername: String?
    @State private var isLoading = true
    @State private var isEditing = false
    @State private var editContent = ""
    @State private var editSummary = ""
    @State private var isSaving = false
    @State private var showHistory = false
    @State private var showReport = false

    var body: some View {
        Group {
            if isLoading {
                loadingState
            } else if let bg = background, !isEditing {
                readState(bg)
            } else if isEditing {
                editState
            } else {
                emptyState
            }
        }
        .task {
            await loadBackground()
        }
        .sheet(isPresented: $showReport) {
            if let bg = background {
                ReportSheet(contentType: "song_background", contentId: bg.id)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.md) {
            Text("no background yet")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.textSecondary)

            Text("be the first to write about this song")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textMuted)

            if auth.isAuthenticated {
                Button {
                    editContent = ""
                    editSummary = ""
                    isEditing = true
                    Haptics.light()
                } label: {
                    Text("Write background")
                        .font(Theme.dmSans(14, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, Theme.Spacing.lg)
                        .padding(.vertical, Theme.Spacing.sm)
                        .background(Theme.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            } else {
                Text("Sign in to contribute")
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.textMuted)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.Spacing.xxl)
    }

    // MARK: - Read State

    private func readState(_ bg: SongBackground) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            Text(bg.content)
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textPrimary)
                .lineSpacing(4)

            // Attribution
            HStack(spacing: 4) {
                if let username = authorUsername {
                    Text("written by")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                    NavigationLink(value: ProfileDestination(userId: bg.authorId, username: username)) {
                        Text("@\(username)")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.accent)
                    }
                }
                if bg.updatedAt != bg.createdAt {
                    Text("· edited \(Self.timeAgo(bg.updatedAt))")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                }
            }

            // Actions
            HStack(spacing: Theme.Spacing.md) {
                if auth.isAuthenticated {
                    Button {
                        editContent = bg.content
                        editSummary = ""
                        isEditing = true
                        Haptics.light()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "pencil")
                                .font(.system(size: 12))
                            Text("Edit")
                                .font(Theme.dmSans(13))
                        }
                        .foregroundStyle(Theme.accent)
                    }
                }

                Button {
                    showHistory = true
                    Haptics.light()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 12))
                        Text("View history")
                            .font(Theme.dmSans(13))
                    }
                    .foregroundStyle(Theme.textMuted)
                }

                Button {
                    showReport = true
                    Haptics.light()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "flag")
                            .font(.system(size: 12))
                        Text("Report")
                            .font(Theme.dmSans(13))
                    }
                    .foregroundStyle(Theme.textMuted)
                }
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
        .sheet(isPresented: $showHistory) {
            if let bg = background {
                SongBackgroundHistoryView(backgroundId: bg.id) { restoredContent in
                    Task { await restoreVersion(restoredContent) }
                }
            }
        }
    }

    // MARK: - Edit State

    private var editState: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            Text(background == nil ? "write about this song" : "edit background")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.textSecondary)

            TextEditor(text: $editContent)
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textPrimary)
                .lineSpacing(4)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 150)
                .padding(Theme.Spacing.md)
                .background(Theme.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .onChange(of: editContent) { _, newValue in
                    if newValue.count > 2000 {
                        editContent = String(newValue.prefix(2000))
                    }
                }

            HStack {
                Text("\(editContent.count)/2000")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(editContent.count > 1800 ? Theme.accent : Theme.textMuted)
                Spacer()
            }

            if background != nil {
                TextField("what changed? (optional)", text: $editSummary)
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Theme.card)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            HStack(spacing: Theme.Spacing.md) {
                Button {
                    isEditing = false
                    Haptics.light()
                } label: {
                    Text("Cancel")
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.textSecondary)
                }

                Spacer()

                Button {
                    Task { await saveBackground() }
                } label: {
                    if isSaving {
                        ProgressView()
                            .scaleEffect(0.8)
                            .tint(.white)
                    } else {
                        Text("Save")
                            .font(Theme.dmSans(14, weight: .medium))
                    }
                }
                .foregroundStyle(.white)
                .padding(.horizontal, Theme.Spacing.lg)
                .padding(.vertical, Theme.Spacing.sm)
                .background(editContent.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? Theme.textMuted.opacity(0.3)
                            : Theme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .disabled(editContent.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            ForEach(0..<4, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 4)
                    .fill(Theme.dividerColor)
                    .frame(height: 14)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
        .redacted(reason: .placeholder)
    }

    // MARK: - Data

    private func loadBackground() async {
        guard let artist = artistName, !artist.isEmpty else {
            isLoading = false
            return
        }

        do {
            let result: [SongBackground] = try await supabase
                .from("song_backgrounds")
                .select("*")
                .ilike("song_title", pattern: songTitle)
                .ilike("artist_name", pattern: artist)
                .limit(1)
                .execute()
                .value

            background = result.first

            if let authorId = background?.authorId {
                let profiles: [Profile] = try await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", value: authorId.uuidString)
                    .limit(1)
                    .execute()
                    .value
                authorUsername = profiles.first?.username
            }
        } catch {
            print("Load background error: \(error)")
        }
        isLoading = false
    }

    private func saveBackground() async {
        guard let userId = auth.userId else { return }
        let trimmed = editContent.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        isSaving = true

        do {
            if let existing = background {
                // Record edit history
                let edit = BackgroundEditInsert(
                    backgroundId: existing.id,
                    editorId: userId,
                    previousContent: existing.content,
                    newContent: trimmed,
                    editSummary: editSummary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        ? nil
                        : editSummary.trimmingCharacters(in: .whitespacesAndNewlines)
                )
                try await supabase
                    .from("song_background_edits")
                    .insert(edit)
                    .execute()

                // Update background
                let update = BackgroundUpdate(
                    content: trimmed,
                    updatedAt: ISO8601DateFormatter().string(from: Date())
                )
                try await supabase
                    .from("song_backgrounds")
                    .update(update)
                    .eq("id", value: existing.id.uuidString)
                    .execute()

                background = SongBackground(
                    id: existing.id,
                    songTitle: existing.songTitle,
                    artistName: existing.artistName,
                    content: trimmed,
                    authorId: existing.authorId,
                    createdAt: existing.createdAt,
                    updatedAt: Date()
                )
            } else {
                // New background
                let insert = BackgroundInsert(
                    songTitle: songTitle.lowercased(),
                    artistName: (artistName ?? "").lowercased(),
                    content: trimmed,
                    authorId: userId
                )
                let result: [SongBackground] = try await supabase
                    .from("song_backgrounds")
                    .insert(insert)
                    .select()
                    .execute()
                    .value
                background = result.first
                authorUsername = auth.profile?.username
            }

            isEditing = false
            Haptics.success()
            toastManager.show("background saved")
        } catch {
            print("Save background error: \(error)")
            toastManager.show("couldn't save, try again")
            Haptics.error()
        }
        isSaving = false
    }

    private func restoreVersion(_ content: String) async {
        editContent = content
        isEditing = true
        // User will review and save manually
    }

    static func timeAgo(_ date: Date) -> String {
        let diff = Date().timeIntervalSince(date)
        let mins = Int(diff / 60)
        if mins < 60 { return "\(mins)m ago" }
        let hours = mins / 60
        if hours < 24 { return "\(hours)h ago" }
        let days = hours / 24
        if days < 30 { return "\(days)d ago" }
        return "\(days / 30)mo ago"
    }
}

// MARK: - Models

struct SongBackground: Codable, Identifiable {
    let id: UUID
    let songTitle: String
    let artistName: String
    let content: String
    let authorId: UUID
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case songTitle = "song_title"
        case artistName = "artist_name"
        case content
        case authorId = "author_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

private struct BackgroundInsert: Encodable {
    let songTitle: String
    let artistName: String
    let content: String
    let authorId: UUID

    enum CodingKeys: String, CodingKey {
        case songTitle = "song_title"
        case artistName = "artist_name"
        case content
        case authorId = "author_id"
    }
}

private struct BackgroundUpdate: Encodable {
    let content: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case content
        case updatedAt = "updated_at"
    }
}

private struct BackgroundEditInsert: Encodable {
    let backgroundId: UUID
    let editorId: UUID
    let previousContent: String
    let newContent: String
    let editSummary: String?

    enum CodingKeys: String, CodingKey {
        case backgroundId = "background_id"
        case editorId = "editor_id"
        case previousContent = "previous_content"
        case newContent = "new_content"
        case editSummary = "edit_summary"
    }
}
