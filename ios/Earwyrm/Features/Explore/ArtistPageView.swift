import SwiftUI
import Supabase

struct ArtistPageView: View {
    let artistName: String

    @Environment(AuthManager.self) private var auth
    @Environment(AuthGate.self) private var authGate
    @Environment(FollowManager.self) private var followManager
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(ToastManager.self) private var toastManager

    @State private var lyrics: [Lyric] = []
    @State private var isLoading = true
    @State private var search = ""
    @State private var sort: SortOption = .newest

    // Interaction state
    @State private var reactionStates: [UUID: Bool] = [:]
    @State private var reactionCounts: [UUID: Int] = [:]
    @State private var animatingReactions: Set<UUID> = []
    @State private var activeSheet: ArtistSheet?
    @State private var showPostSheet = false

    private enum ArtistSheet: Identifiable {
        case pageShare
        case shareLyric(Lyric)
        case bookmark(UUID)

        var id: String {
            switch self {
            case .pageShare: return "pageShare"
            case .shareLyric(let lyric): return "shareLyric-\(lyric.id)"
            case .bookmark(let uuid): return "bookmark-\(uuid)"
            }
        }
    }

    private var isFollowing: Bool {
        followManager.isFollowing(type: "artist", value: artistName)
    }

    private var uniqueSongs: [(title: String, coverArt: String?, count: Int)] {
        var songs: [String: (title: String, coverArt: String?, count: Int)] = [:]
        for lyric in lyrics {
            if let title = lyric.songTitle {
                let key = title.lowercased()
                let existing = songs[key]
                songs[key] = (
                    title: existing?.title ?? title,
                    coverArt: existing?.coverArt ?? lyric.coverArtUrl,
                    count: (existing?.count ?? 0) + 1
                )
            }
        }
        return songs.values
            .sorted { $0.count > $1.count }
    }

    private var stats: PageStats {
        PageStats.from(lyrics: lyrics, songCount: uniqueSongs.count)
    }

    private var allClusters: [LyricCluster] {
        LyricClusterer.cluster(lyrics)
    }

    private var topSavedClusters: [LyricCluster] {
        LyricClusterer.topSaved(allClusters, limit: 3)
    }

    private var filteredClusters: [LyricCluster] {
        var result = allClusters
        if !search.isEmpty {
            let q = search.lowercased()
            result = result.filter {
                $0.representative.content.lowercased().contains(q)
                || ($0.representative.songTitle?.lowercased().contains(q) ?? false)
            }
        }
        switch sort {
        case .newest:
            return result.sorted { $0.mostRecent.createdAt > $1.mostRecent.createdAt }
        case .resonated:
            return result.sorted { $0.totalReactions > $1.totalReactions }
        case .discussed:
            return result.sorted { $0.totalComments > $1.totalComments }
        }
    }

    private static let lyricColumns = """
        id, user_id, content, song_title, artist_name, cover_art_url, \
        album_name, is_current, is_public, tags, share_token, \
        canonical_lyric_id, musicbrainz_recording_id, musicbrainz_release_id, \
        reaction_count, comment_count, card_art_url, created_at, replaced_at
        """

    var body: some View {
        ScrollView {
            if isLoading {
                loadingState
            } else {
                LazyVStack(spacing: Theme.Spacing.lg) {
                    artistHeader
                    PageStatsRow(stats: stats)

                    if !uniqueSongs.isEmpty {
                        songsList
                    }

                    MostSavedSection(clusters: topSavedClusters)

                    feedSection
                }
                .padding(.top, Theme.Spacing.md)
                .padding(.bottom, 100)
            }
        }
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    activeSheet = .pageShare
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
        .sheet(item: $activeSheet) { sheet in
            switch sheet {
            case .pageShare:
                PageShareModalView(
                    pageTitle: artistName,
                    pageSubtitle: nil,
                    stats: stats,
                    featuredLyric: topSavedClusters.first?.representative.content,
                    coverArtUrl: lyrics.first(where: { $0.coverArtUrl != nil })?.coverArtUrl,
                    shareURL: artistShareURL,
                    shareText: "lyrics from \(artistName) on earwyrm"
                )
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            case .shareLyric(let lyric):
                ShareModalView(lyric: lyric, note: nil, username: nil)
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            case .bookmark(let lyricId):
                CollectionPickerSheet(lyricId: lyricId)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
        .fullScreenCover(isPresented: $showPostSheet) {
            PostLyricView(
                currentLyricId: nil,
                onSaved: { Task { await fetchArtistLyrics() } },
                prefillArtistName: artistName
            )
        }
        .task {
            async let lyrics: () = fetchArtistLyrics()
            async let reactions: () = fetchReactionStates()
            _ = await (lyrics, reactions)
            Analytics.track(.artistPageViewed, ["artist": artistName])
        }
    }

    private var artistShareURL: URL? {
        let slug = artistName.lowercased()
            .replacingOccurrences(of: " ", with: "-")
            .addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? artistName
        return URL(string: "https://earwyrm.app/artist/\(slug)")
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Circle()
                .fill(Theme.dividerColor)
                .frame(width: 80, height: 80)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.dividerColor)
                .frame(width: 140, height: 20)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.dividerColor)
                .frame(width: 80, height: 14)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Theme.Spacing.xxl)
        .redacted(reason: .placeholder)
    }

    // MARK: - Header

    private var artistHeader: some View {
        VStack(spacing: Theme.Spacing.md) {
            if let firstCover = lyrics.first(where: { $0.coverArtUrl != nil })?.coverArtUrl,
               let url = URL(string: firstCover) {
                CachedAsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    artistInitialCircle
                }
                .frame(width: 80, height: 80)
                .clipShape(Circle())
                .shadow(color: .black.opacity(0.1), radius: 6, y: 2)
            } else {
                artistInitialCircle
            }

            Text(artistName)
                .font(Theme.dmSans(22, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)

            FollowButton(isFollowing: isFollowing) {
                if auth.isAuthenticated {
                    Task {
                        guard let userId = auth.userId else { return }
                        if isFollowing {
                            await followManager.unfollow(userId: userId, type: "artist", value: artistName)
                        } else {
                            await followManager.follow(userId: userId, type: "artist", value: artistName)
                        }
                    }
                } else {
                    authGate.showAuthSheet = true
                }
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    private var artistInitialCircle: some View {
        Circle()
            .fill(Theme.accent.opacity(0.3))
            .frame(width: 80, height: 80)
            .overlay(
                CaveatText(text: String(artistName.prefix(1)).uppercased(), size: 36, weight: .bold, color: Theme.textPrimary)
            )
    }

    // MARK: - Songs

    private var songsList: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("songs")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.textSecondary)
                .padding(.horizontal, Theme.Spacing.md)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Spacing.md) {
                    ForEach(uniqueSongs, id: \.title) { song in
                        NavigationLink(value: SongDestination(
                            title: song.title,
                            artistName: artistName,
                            coverArtUrl: song.coverArt
                        )) {
                            songTile(song)
                        }
                    }
                }
                .padding(.horizontal, Theme.Spacing.md)
            }
        }
    }

    @ViewBuilder
    private func songTile(_ song: (title: String, coverArt: String?, count: Int)) -> some View {
        VStack(spacing: Theme.Spacing.sm) {
            if let url = song.coverArt,
               let imageUrl = URL(string: url) {
                CachedAsyncImage(url: imageUrl) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Theme.dividerColor)
                }
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Theme.dividerColor)
                    .frame(width: 80, height: 80)
                    .overlay(
                        Image(systemName: "music.note")
                            .foregroundStyle(Theme.textMuted)
                    )
            }

            Text(song.title)
                .font(Theme.dmSans(12))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(2)
                .frame(width: 80)

            Text("\(song.count) save\(song.count == 1 ? "" : "s")")
                .font(Theme.dmSans(11))
                .foregroundStyle(Theme.textMuted)
        }
    }

    // MARK: - Feed

    private var feedSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("all saves")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.textSecondary)
                .padding(.horizontal, Theme.Spacing.md)

            searchSortBar

            LazyVStack(spacing: Theme.Spacing.sm) {
                ForEach(filteredClusters) { cluster in
                    let lyric = cluster.representative
                    ClusteredLyricCard(
                        cluster: cluster,
                        hasReacted: reactionStates[lyric.id] ?? false,
                        reactionCount: reactionCounts[lyric.id] ?? lyric.reactionCount ?? 0,
                        isResonateAnimating: animatingReactions.contains(lyric.id),
                        onResonate: { toggleReaction(for: lyric) },
                        onSave: { activeSheet = .bookmark(lyric.id) },
                        onShare: { activeSheet = .shareLyric(lyric) },
                        isSaved: collectionManager.isLyricSaved(lyric.id)
                    )
                    .padding(.horizontal, Theme.Spacing.md)
                }
            }

            if filteredClusters.isEmpty && !isLoading {
                if lyrics.isEmpty {
                    beTheFirstCTA
                } else {
                    Text("No lyrics found")
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.textMuted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Theme.Spacing.lg)
                }
            }
        }
    }

    private var searchSortBar: some View {
        HStack(spacing: Theme.Spacing.sm) {
            HStack(spacing: Theme.Spacing.sm) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.textMuted)
                TextField("Search lyrics...", text: $search)
                    .font(Theme.dmSans(13))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            Menu {
                ForEach(SortOption.allCases, id: \.self) { option in
                    Button {
                        sort = option
                        Haptics.light()
                    } label: {
                        HStack {
                            Text(option.rawValue)
                            if sort == option {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                Image(systemName: "arrow.up.arrow.down")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.textSecondary)
                    .frame(width: 36, height: 36)
                    .background(Theme.card)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    // MARK: - Be The First CTA

    private var beTheFirstCTA: some View {
        VStack(spacing: Theme.Spacing.md) {
            CaveatText(text: "no earwyrms yet", size: 22, color: Theme.textSecondary)

            Text("be the first to share a lyric from \(artistName)")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)

            Button {
                Haptics.light()
                if auth.isAuthenticated {
                    showPostSheet = true
                } else {
                    authGate.showAuthSheet = true
                }
            } label: {
                Text("post a lyric")
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(Theme.accent)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Theme.accent.opacity(0.12))
                    .clipShape(Capsule())
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.Spacing.xl)
    }

    // MARK: - Data

    private func fetchArtistLyrics() async {
        isLoading = true
        do {
            let result: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .eq("is_public", value: true)
                .ilike("artist_name", pattern: artistName)
                .order("created_at", ascending: false)
                .limit(100)
                .execute()
                .value
            lyrics = result
        } catch {
            print("Fetch artist lyrics error: \(error)")
        }
        isLoading = false
    }

    // MARK: - Reactions

    private func fetchReactionStates() async {
        guard let userId = auth.userId else { return }
        let lyricIds = lyrics.map { $0.id.uuidString }
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

        // Optimistic update
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
                // Revert
                reactionStates[lyric.id] = wasReacted
                reactionCounts[lyric.id] = currentCount
                toastManager.show("couldn't resonate, try again")
            }
        }
    }
}
