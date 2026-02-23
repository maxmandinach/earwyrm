import SwiftUI

struct ExploreFollowingView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager
    let viewModel: ExploreViewModel
    var onShare: ((Lyric, String?) -> Void)?

    @State private var search = ""
    @State private var timeRange: TimeRange = .all
    @State private var sort: SortOption = .newest
    @State private var activeFollowIds: Set<UUID> = []
    @State private var showFilterSheet = false
    @State private var visibleCount = 20

    private var feed: [Lyric] {
        viewModel.followingFeed(
            follows: followManager.follows,
            activeFollowIds: activeFollowIds,
            timeRange: timeRange,
            search: search,
            sort: sort,
            limit: visibleCount,
            userId: auth.userId
        )
    }

    private var hasMore: Bool {
        feed.count >= visibleCount
    }

    private var hasActiveFilter: Bool {
        !activeFollowIds.isEmpty
    }

    var body: some View {
        LazyVStack(spacing: Theme.Spacing.md) {
            if followManager.follows.isEmpty {
                emptyState
                    .padding(.top, Theme.Spacing.xxl)
            } else {
                // Follow chips
                followChips
                    .padding(.horizontal, Theme.Spacing.md)

                // Filter bar
                FeedFilterBar(search: $search, timeRange: $timeRange, sort: $sort)
                    .padding(.horizontal, Theme.Spacing.md)

                // Feed
                if viewModel.isLoading {
                    ForEach(0..<3, id: \.self) { _ in
                        shimmerCard
                            .padding(.horizontal, Theme.Spacing.md)
                    }
                } else if feed.isEmpty {
                    noResultsState
                        .padding(.top, Theme.Spacing.xl)
                } else {
                    ForEach(feed) { lyric in
                        CompactLyricCard(
                            lyric: lyric,
                            username: viewModel.profileMap[lyric.userId],
                            onShare: onShare != nil ? { onShare?(lyric, viewModel.profileMap[lyric.userId]) } : nil
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
                                .foregroundStyle(Theme.Light.accent)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Theme.Spacing.md)
                        }
                        .frame(minHeight: 44)
                    }
                }
            }
        }
        .sheet(isPresented: $showFilterSheet) {
            FollowFilterSheet(
                follows: followManager.follows,
                activeFollowIds: $activeFollowIds
            )
            .presentationDetents([.medium, .large])
        }
        .onChange(of: search) { _, _ in visibleCount = 20 }
        .onChange(of: timeRange) { _, _ in visibleCount = 20 }
        .onChange(of: sort) { _, _ in visibleCount = 20 }
        .onChange(of: activeFollowIds) { _, _ in visibleCount = 20 }
    }

    // MARK: - Follow Chips

    private var followChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.sm) {
                // Inline chips for < 6 follows
                if followManager.follows.count < 6 {
                    ForEach(followManager.follows) { follow in
                        let isActive = activeFollowIds.isEmpty || activeFollowIds.contains(follow.id)

                        Button {
                            if activeFollowIds.isEmpty {
                                // First tap: select only this one
                                activeFollowIds = Set([follow.id])
                            } else if activeFollowIds.contains(follow.id) {
                                activeFollowIds.remove(follow.id)
                                if activeFollowIds.isEmpty {
                                    // Back to showing all
                                }
                            } else {
                                activeFollowIds.insert(follow.id)
                            }
                            Haptics.light()
                        } label: {
                            Text(follow.filterType == "tag"
                                 ? "#\(follow.filterValue)"
                                 : follow.filterValue)
                                .font(Theme.dmSans(12))
                                .foregroundStyle(
                                    isActive
                                        ? (hasActiveFilter
                                            ? Theme.Light.text.opacity(0.7)
                                            : Theme.Light.text.opacity(0.5))
                                        : Theme.Light.text.opacity(0.3)
                                )
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(
                                    Capsule()
                                        .strokeBorder(
                                            isActive && hasActiveFilter
                                                ? Theme.Light.text.opacity(0.4)
                                                : Theme.Light.text.opacity(0.1),
                                            lineWidth: 1
                                        )
                                        .background(
                                            isActive && hasActiveFilter
                                                ? Capsule().fill(Theme.Light.text.opacity(0.05))
                                                : Capsule().fill(Color.clear)
                                        )
                                )
                        }
                    }
                } else {
                    // Summary pill for 6+ follows
                    Button {
                        showFilterSheet = true
                        Haptics.light()
                    } label: {
                        Text(activeFollowIds.isEmpty
                             ? "all follows (\(followManager.follows.count))"
                             : "\(activeFollowIds.count) active")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.Light.text.opacity(0.5))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                Capsule()
                                    .strokeBorder(Theme.Light.text.opacity(0.15), lineWidth: 1)
                            )
                    }
                }
            }
        }
    }

    // MARK: - States

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Text("Follow artists, songs, and tags to build your feed")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.Light.secondary)
                .multilineTextAlignment(.center)
            Text("Tap follow on any artist, song, or tag page")
                .font(Theme.dmSans(13))
                .foregroundStyle(Theme.Light.muted)
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }

    private var noResultsState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Text(noResultsTitle)
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.Light.secondary)
            Text(noResultsSubtitle)
                .font(Theme.dmSans(13))
                .foregroundStyle(Theme.Light.muted)
        }
    }

    private var noResultsTitle: String {
        if !search.isEmpty { return "No matches" }
        if hasActiveFilter && activeFollowIds.isEmpty { return "No filters selected" }
        if timeRange != .all { return "Nothing recent" }
        return "Nothing new yet"
    }

    private var noResultsSubtitle: String {
        if !search.isEmpty { return "Try a different search" }
        if hasActiveFilter && activeFollowIds.isEmpty { return "Select some follows to see their lyrics" }
        if timeRange != .all { return "Try expanding the time range" }
        return "New public lyrics from your follows will appear here"
    }

    private var shimmerCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.Light.divider)
                .frame(height: 50)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.Light.divider)
                .frame(width: 100, height: 14)
        }
        .padding(Theme.Spacing.md)
        .background(Theme.Light.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .redacted(reason: .placeholder)
    }
}
