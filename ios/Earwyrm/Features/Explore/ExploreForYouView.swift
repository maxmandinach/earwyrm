import SwiftUI

struct ExploreForYouView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager
    @Environment(BlockManager.self) private var blockManager
    let viewModel: ExploreViewModel
    var onShare: ((Lyric, String?) -> Void)?

    @Environment(CollectionManager.self) private var collectionManager
    @Environment(AuthGate.self) private var authGate
    @Environment(ToastManager.self) private var toastManager

    @State private var search = ""
    @State private var reportLyric: Lyric?
    @State private var blockTarget: (userId: UUID, username: String)?
    @State private var showBlockAlert = false
    @State private var timeRange: TimeRange = .all
    @State private var sort: SortOption = .newest
    @State private var selectedTags: Set<String> = []
    @State private var visibleCount = 20

    // Interaction state
    @State private var reactionStates: [UUID: Bool] = [:]
    @State private var reactionCounts: [UUID: Int] = [:]
    @State private var animatingReactions: Set<UUID> = []
    @State private var bookmarkLyricId: IdentifiableUUID?

    private var feed: [Lyric] {
        viewModel.forYouFeed(
            follows: followManager.follows,
            userId: auth.userId,
            selectedTags: selectedTags,
            timeRange: timeRange,
            search: search,
            sort: sort,
            limit: visibleCount
        ).filter { !blockManager.isBlocked($0.userId) }
    }

    private var hasMore: Bool {
        feed.count >= visibleCount
    }

    var body: some View {
        LazyVStack(spacing: Theme.Spacing.md) {
            // Trending tags
            if !viewModel.trendingTags.isEmpty {
                TrendingTagsView(tags: viewModel.trendingTags, selectedTags: $selectedTags)
                    .padding(.horizontal, Theme.Spacing.md)
            }

            // Filter bar
            FeedFilterBar(search: $search, timeRange: $timeRange, sort: $sort)
                .padding(.horizontal, Theme.Spacing.md)

            // Feed content
            if viewModel.isLoading {
                ForEach(0..<5, id: \.self) { _ in
                    shimmerCard
                        .padding(.horizontal, Theme.Spacing.md)
                }
            } else if feed.isEmpty {
                emptyState
                    .padding(.top, Theme.Spacing.xl)
                    .onAppear {
                        if !search.isEmpty {
                            Analytics.track(.searchNoResults, ["query": String(search.prefix(50))])
                        }
                    }
            } else {
                ForEach(feed) { lyric in
                    CompactLyricCard(
                        lyric: lyric,
                        username: viewModel.profileMap[lyric.userId],
                        onShare: onShare != nil ? { onShare?(lyric, viewModel.profileMap[lyric.userId]) } : nil,
                        onSave: { bookmarkLyricId = IdentifiableUUID(lyric.id) },
                        onReport: { reportLyric = lyric },
                        onBlock: {
                            blockTarget = (userId: lyric.userId, username: viewModel.profileMap[lyric.userId] ?? "user")
                            showBlockAlert = true
                        },
                        isSaved: collectionManager.isLyricSaved(lyric.id),
                        hasReacted: reactionStates[lyric.id] ?? false,
                        reactionCount: reactionCounts[lyric.id] ?? lyric.reactionCount ?? 0,
                        isResonateAnimating: animatingReactions.contains(lyric.id),
                        onResonate: { toggleReaction(for: lyric) }
                    )
                    .padding(.horizontal, Theme.Spacing.md)
                }

                if hasMore {
                    Button {
                        visibleCount += 20
                        Haptics.light()
                    } label: {
                        Text("Load more")
                            .font(Theme.dmSans(14, weight: .medium))
                            .foregroundStyle(Theme.accent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Theme.Spacing.md)
                    }
                    .frame(minHeight: 44)
                }
            }
        }
        .onChange(of: search) { _, newValue in
            visibleCount = 20
            if newValue.count >= 3 {
                Analytics.track(.searchPerformed, ["query": String(newValue.prefix(50))])
            }
        }
        .onChange(of: timeRange) { _, _ in visibleCount = 20 }
        .onChange(of: sort) { _, _ in visibleCount = 20 }
        .onChange(of: selectedTags) { _, _ in visibleCount = 20 }
        .sheet(item: $reportLyric) { lyric in
            ReportSheet(contentType: "lyric", contentId: lyric.id)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .alert(
            "Block @\(blockTarget?.username ?? "user")?",
            isPresented: $showBlockAlert
        ) {
            Button("Block", role: .destructive) {
                guard let target = blockTarget, let userId = auth.userId else { return }
                Task {
                    await blockManager.block(currentUserId: userId, targetUserId: target.userId)
                }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Their content will be hidden from your feeds.")
        }
        .sheet(item: $bookmarkLyricId) { item in
            CollectionPickerSheet(lyricId: item.value)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .task {
            await fetchReactionStates()
        }
        .onChange(of: viewModel.isLoading) { _, isLoading in
            if !isLoading { Task { await fetchReactionStates() } }
        }
    }

    // MARK: - Reactions

    private func fetchReactionStates() async {
        guard let userId = auth.userId else { return }
        let lyricIds = feed.map { $0.id.uuidString }
        guard !lyricIds.isEmpty else { return }
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
            print("Fetch reaction states error: \(error)")
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

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Text(emptyTitle)
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.textSecondary)
            Text(emptySubtitle)
                .font(Theme.dmSans(13))
                .foregroundStyle(Theme.textMuted)
        }
    }

    private var emptyTitle: String {
        if !search.isEmpty { return "No matches" }
        if !selectedTags.isEmpty { return "No lyrics for these moods" }
        if timeRange != .all { return "Nothing recent" }
        return "Nothing to explore yet"
    }

    private var emptySubtitle: String {
        if !search.isEmpty { return "Try a different search" }
        if !selectedTags.isEmpty { return "Try selecting different moods" }
        if timeRange != .all { return "Try expanding the time range" }
        return "Lyrics shared publicly will appear here"
    }

    // MARK: - Shimmer

    private var shimmerCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.dividerColor)
                .frame(height: 56)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.dividerColor)
                .frame(width: 120, height: 14)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.dividerColor)
                .frame(width: 80, height: 12)
        }
        .padding(Theme.Spacing.md)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .redacted(reason: .placeholder)
    }
}
