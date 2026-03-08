import SwiftUI

struct ProfileLyricsView: View {
    let currentLyrics: [Lyric]
    let pastLyrics: [Lyric]
    var onLyricUpdated: (() -> Void)?

    @Environment(AuthManager.self) private var auth
    @Environment(AuthGate.self) private var authGate
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(ToastManager.self) private var toastManager

    @State private var reactionStates: [UUID: Bool] = [:]
    @State private var reactionCounts: [UUID: Int] = [:]
    @State private var animatingReactions: Set<UUID> = []
    @State private var bookmarkLyricId: IdentifiableUUID?
    @State private var shareLyric: Lyric?
    @State private var showCommentIds: Set<UUID> = []

    private var allLyrics: [Lyric] { currentLyrics + pastLyrics }

    var body: some View {
        if currentLyrics.isEmpty && pastLyrics.isEmpty {
            emptyState
        } else {
            VStack(spacing: Theme.Spacing.lg) {
                // Current lyrics
                if !currentLyrics.isEmpty {
                    LazyVStack(spacing: Theme.Spacing.sm) {
                        ForEach(currentLyrics) { lyric in
                            ProfileLyricRow(
                                lyric: lyric,
                                hasReacted: reactionStates[lyric.id] ?? false,
                                reactionCount: reactionCounts[lyric.id] ?? lyric.reactionCount ?? 0,
                                isResonateAnimating: animatingReactions.contains(lyric.id),
                                onResonate: { toggleReaction(for: lyric) },
                                commentCount: lyric.commentCount ?? 0,
                                showComments: showCommentIds.contains(lyric.id),
                                onToggleComments: { toggleComments(lyric.id) },
                                isPublic: lyric.isPublic ?? false,
                                onVisibilityChange: { newValue in toggleVisibility(lyric: lyric, isPublic: newValue) },
                                onSave: { bookmarkLyricId = IdentifiableUUID(lyric.id) },
                                isSaved: collectionManager.isLyricSaved(lyric.id),
                                onShare: { shareLyric = lyric },
                                isOwn: lyric.userId == auth.userId,
                                currentUserId: auth.userId
                            )
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.top, Theme.Spacing.sm)
                }

                // Memory lane for past lyrics
                MemoryLaneSection(lyrics: pastLyrics)

                // Past lyrics list (for those with < 3 past lyrics, since MemoryLaneSection requires >= 3)
                if !pastLyrics.isEmpty && pastLyrics.count < 3 {
                    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                        CaveatText(text: "past earwyrms", size: 24, color: Theme.textSecondary)
                            .padding(.horizontal, Theme.Spacing.md)

                        LazyVStack(spacing: Theme.Spacing.sm) {
                            ForEach(pastLyrics) { lyric in
                                ProfileLyricRow(
                                    lyric: lyric,
                                    hasReacted: reactionStates[lyric.id] ?? false,
                                    reactionCount: reactionCounts[lyric.id] ?? lyric.reactionCount ?? 0,
                                    isResonateAnimating: animatingReactions.contains(lyric.id),
                                    onResonate: { toggleReaction(for: lyric) },
                                    commentCount: lyric.commentCount ?? 0,
                                    showComments: showCommentIds.contains(lyric.id),
                                    onToggleComments: { toggleComments(lyric.id) },
                                    isPublic: lyric.isPublic ?? false,
                                    onVisibilityChange: { newValue in toggleVisibility(lyric: lyric, isPublic: newValue) },
                                    onSave: { bookmarkLyricId = IdentifiableUUID(lyric.id) },
                                    isSaved: collectionManager.isLyricSaved(lyric.id),
                                    onShare: { shareLyric = lyric },
                                    isOwn: lyric.userId == auth.userId,
                                    currentUserId: auth.userId
                                )
                            }
                        }
                        .padding(.horizontal, Theme.Spacing.md)
                    }
                }
            }
            .task { await fetchReactionStates() }
            .sheet(item: $bookmarkLyricId) { item in
                CollectionPickerSheet(lyricId: item.value)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
            .sheet(item: $shareLyric) { lyric in
                ShareModalView(
                    lyric: lyric,
                    note: nil,
                    username: auth.profile?.username
                )
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                .presentationBackground(Theme.background)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Spacer().frame(height: 60)
            Text("no lyrics yet")
                .font(Theme.caveat(28))
                .foregroundStyle(Theme.textPrimary)
            Text("Post your first earwyrm from the Home tab.")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }

    // MARK: - Reactions

    private func fetchReactionStates() async {
        guard let userId = auth.userId else { return }
        let lyricIds = allLyrics.map { $0.id.uuidString }
        guard !lyricIds.isEmpty else { return }

        // Initialize counts from lyric data
        for lyric in allLyrics {
            if reactionCounts[lyric.id] == nil {
                reactionCounts[lyric.id] = lyric.reactionCount ?? 0
            }
        }

        do {
            let reactions: [Reaction] = try await supabase
                .from("reactions")
                .select("id, lyric_id, user_id, created_at")
                .eq("user_id", value: userId.uuidString)
                .in("lyric_id", values: lyricIds)
                .execute()
                .value
            for reaction in reactions {
                reactionStates[reaction.lyricId] = true
            }
        } catch {
            print("Fetch profile reaction states error: \(error)")
        }
    }

    private func toggleReaction(for lyric: Lyric) {
        guard let userId = auth.userId else {
            authGate.showAuthSheet = true
            return
        }

        let wasReacted = reactionStates[lyric.id] ?? false
        let currentCount = reactionCounts[lyric.id] ?? lyric.reactionCount ?? 0

        reactionStates[lyric.id] = !wasReacted
        reactionCounts[lyric.id] = currentCount + (wasReacted ? -1 : 1)

        if !wasReacted {
            animatingReactions.insert(lyric.id)
            Haptics.medium()
            Task {
                try? await Task.sleep(nanoseconds: 600_000_000)
                animatingReactions.remove(lyric.id)
            }
        } else {
            Haptics.light()
        }

        Task {
            do {
                if wasReacted {
                    try await supabase
                        .from("reactions")
                        .delete()
                        .eq("lyric_id", value: lyric.id.uuidString)
                        .eq("user_id", value: userId.uuidString)
                        .execute()
                } else {
                    let insert = ReactionInsert(lyricId: lyric.id, userId: userId)
                    try await supabase
                        .from("reactions")
                        .insert(insert)
                        .execute()
                }
            } catch {
                reactionStates[lyric.id] = wasReacted
                reactionCounts[lyric.id] = currentCount
                toastManager.show("couldn't resonate, try again")
            }
        }
    }

    private func toggleVisibility(lyric: Lyric, isPublic: Bool) {
        Task {
            do {
                try await supabase
                    .from("lyrics")
                    .update(LyricVisibilityUpdate(isPublic: isPublic))
                    .eq("id", value: lyric.id.uuidString)
                    .execute()
                Haptics.light()
                onLyricUpdated?()
            } catch {
                toastManager.show("couldn't update visibility")
            }
        }
    }

    private func toggleComments(_ lyricId: UUID) {
        if showCommentIds.contains(lyricId) {
            showCommentIds.remove(lyricId)
        } else {
            showCommentIds.insert(lyricId)
        }
    }
}
