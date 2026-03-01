import SwiftUI
import Supabase

struct SongBackgroundHistoryView: View {
    let backgroundId: UUID
    let onRestore: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(AuthManager.self) private var auth

    @State private var edits: [BackgroundEdit] = []
    @State private var editorNames: [UUID: String] = [:]
    @State private var isLoading = true
    @State private var expandedEditId: UUID?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if edits.isEmpty {
                    VStack(spacing: Theme.Spacing.md) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 28))
                            .foregroundStyle(Theme.textMuted)
                        Text("no edit history")
                            .font(Theme.caveat(22))
                            .foregroundStyle(Theme.textSecondary)
                        Text("this background hasn't been edited yet")
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.textMuted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: Theme.Spacing.md) {
                            ForEach(edits) { edit in
                                editRow(edit)
                            }
                        }
                        .padding(.horizontal, Theme.Spacing.md)
                        .padding(.top, Theme.Spacing.md)
                        .padding(.bottom, 60)
                    }
                }
            }
            .background(Theme.background)
            .navigationTitle("edit history")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .task {
                await loadHistory()
            }
        }
    }

    private func editRow(_ edit: BackgroundEdit) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Header
            HStack {
                if let name = editorNames[edit.editorId] {
                    Text("@\(name)")
                        .font(Theme.dmSans(13, weight: .medium))
                        .foregroundStyle(Theme.accent)
                }
                Text("·")
                    .foregroundStyle(Theme.textMuted)
                Text(SongBackgroundView.timeAgo(edit.createdAt))
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.textMuted)

                Spacer()

                if auth.isAuthenticated {
                    Button {
                        Haptics.light()
                        onRestore(edit.previousContent)
                        dismiss()
                    } label: {
                        Text("Restore")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.accent)
                    }
                }
            }

            if let summary = edit.editSummary, !summary.isEmpty {
                Text(summary)
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.textSecondary)
                    .italic()
            }

            // Expandable diff
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    expandedEditId = expandedEditId == edit.id ? nil : edit.id
                }
                Haptics.light()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: expandedEditId == edit.id ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10))
                    Text(expandedEditId == edit.id ? "hide changes" : "show changes")
                        .font(Theme.dmSans(12))
                }
                .foregroundStyle(Theme.textMuted)
            }

            if expandedEditId == edit.id {
                VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                    Text("Previous:")
                        .font(Theme.dmSans(11, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                    Text(edit.previousContent)
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textSecondary)
                        .padding(Theme.Spacing.sm)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: 6))

                    Text("New:")
                        .font(Theme.dmSans(11, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                    Text(edit.newContent)
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textSecondary)
                        .padding(Theme.Spacing.sm)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.green.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(Theme.Spacing.md)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func loadHistory() async {
        do {
            let result: [BackgroundEdit] = try await supabase
                .from("song_background_edits")
                .select("*")
                .eq("background_id", value: backgroundId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value
            edits = result

            // Fetch editor usernames
            let editorIds = Array(Set(result.map { $0.editorId }))
            if !editorIds.isEmpty {
                let profiles: [Profile] = try await supabase
                    .from("profiles")
                    .select("id, username")
                    .in("id", values: editorIds.map { $0.uuidString })
                    .execute()
                    .value
                for profile in profiles {
                    editorNames[profile.id] = profile.username
                }
            }
        } catch {
            print("Load edit history error: \(error)")
        }
        isLoading = false
    }
}

// MARK: - Model

struct BackgroundEdit: Codable, Identifiable {
    let id: UUID
    let backgroundId: UUID
    let editorId: UUID
    let previousContent: String
    let newContent: String
    let editSummary: String?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case backgroundId = "background_id"
        case editorId = "editor_id"
        case previousContent = "previous_content"
        case newContent = "new_content"
        case editSummary = "edit_summary"
        case createdAt = "created_at"
    }
}
