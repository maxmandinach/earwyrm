import SwiftUI

struct ExploreForYouView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager
    let viewModel: ExploreViewModel
    var onShare: ((Lyric, String?) -> Void)?

    @State private var search = ""
    @State private var timeRange: TimeRange = .all
    @State private var sort: SortOption = .newest
    @State private var selectedTags: Set<String> = []
    @State private var visibleCount = 20

    private var feed: [Lyric] {
        viewModel.forYouFeed(
            follows: followManager.follows,
            userId: auth.userId,
            selectedTags: selectedTags,
            timeRange: timeRange,
            search: search,
            sort: sort,
            limit: visibleCount
        )
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
        .onChange(of: search) { _, _ in visibleCount = 20 }
        .onChange(of: timeRange) { _, _ in visibleCount = 20 }
        .onChange(of: sort) { _, _ in visibleCount = 20 }
        .onChange(of: selectedTags) { _, _ in visibleCount = 20 }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Text(emptyTitle)
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.Light.secondary)
            Text(emptySubtitle)
                .font(Theme.dmSans(13))
                .foregroundStyle(Theme.Light.muted)
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
                .fill(Theme.Light.divider)
                .frame(height: 56)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.Light.divider)
                .frame(width: 120, height: 14)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.Light.divider)
                .frame(width: 80, height: 12)
        }
        .padding(Theme.Spacing.md)
        .background(Theme.Light.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .redacted(reason: .placeholder)
    }
}
