import SwiftUI
import Supabase

struct SongPageView: View {
    let songTitle: String
    let artistName: String?
    let coverArtUrl: String?

    @Environment(AuthManager.self) private var auth
    @Environment(AuthGate.self) private var authGate
    @Environment(FollowManager.self) private var followManager
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(ToastManager.self) private var toastManager

    @State private var lyrics: [Lyric] = []
    @State private var moreFromArtist: [Lyric] = []
    @State private var isLoading = true
    @State private var search = ""
    @State private var sort: SortOption = .newest
    @State private var showPageShare = false

    // Interaction state
    @State private var reactionStates: [UUID: Bool] = [:]
    @State private var reactionCounts: [UUID: Int] = [:]
    @State private var animatingReactions: Set<UUID> = []
    @State private var bookmarkLyricId: IdentifiableUUID?
    @State private var shareLyric: Lyric?

    private var isFollowing: Bool {
        followManager.isFollowing(type: "song", value: songTitle)
    }

    private var stats: PageStats {
        PageStats.from(lyrics: lyrics)
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

    private var albumName: String? {
        lyrics.first { $0.albumName != nil }?.albumName
    }

    private var uniqueMoreFromArtist: [Lyric] {
        var seen = Set<String>()
        return moreFromArtist.filter { lyric in
            guard let title = lyric.songTitle else { return false }
            let key = title.lowercased()
            if seen.contains(key) { return false }
            seen.insert(key)
            return true
        }
    }

    private static let lyricColumns = """
        id, user_id, content, song_title, artist_name, cover_art_url, \
        album_name, is_current, is_public, tags, share_token, \
        canonical_lyric_id, musicbrainz_recording_id, musicbrainz_release_id, \
        reaction_count, comment_count, created_at, replaced_at
        """

    var body: some View {
        ScrollView {
            if isLoading {
                loadingState
            } else {
                LazyVStack(spacing: Theme.Spacing.lg) {
                    songHeader
                    PageStatsRow(stats: stats)

                    MostSavedSection(clusters: topSavedClusters)

                    feedSection

                    if let artist = artistName, !uniqueMoreFromArtist.isEmpty {
                        moreFromArtistSection(artistName: artist)
                    }
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
                    showPageShare = true
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
        .sheet(isPresented: $showPageShare) {
            PageShareModalView(
                pageTitle: songTitle,
                pageSubtitle: [artistName, albumName].compactMap { $0 }.joined(separator: " · "),
                stats: stats,
                featuredLyric: topSavedClusters.first?.representative.content,
                coverArtUrl: coverArtUrl,
                shareURL: songShareURL,
                shareText: "lyrics from \(songTitle) on earwyrm"
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(item: $shareLyric) { lyric in
            ShareModalView(lyric: lyric, note: nil, username: nil)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(item: $bookmarkLyricId) { item in
            CollectionPickerSheet(lyricId: item.value)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .task {
            await fetchSongLyrics()
            await fetchReactionStates()
            if let artist = artistName {
                await fetchMoreFromArtist(artist)
            }
            Analytics.track(.songPageViewed, ["song": songTitle, "artist": artistName ?? ""])
        }
    }

    private var songShareURL: URL? {
        let slug = songTitle.lowercased()
            .replacingOccurrences(of: " ", with: "-")
            .addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? songTitle
        var urlString = "https://earwyrm.app/song/\(slug)"
        if let artist = artistName?.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            urlString += "?artist=\(artist)"
        }
        return URL(string: urlString)
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: Theme.Spacing.lg) {
            RoundedRectangle(cornerRadius: 12)
                .fill(Theme.dividerColor)
                .frame(width: 120, height: 120)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.dividerColor)
                .frame(width: 160, height: 20)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.dividerColor)
                .frame(width: 100, height: 14)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Theme.Spacing.xxl)
        .redacted(reason: .placeholder)
    }

    // MARK: - Header

    private var songHeader: some View {
        VStack(spacing: Theme.Spacing.md) {
            if let urlStr = coverArtUrl, let url = URL(string: urlStr) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Theme.dividerColor)
                }
                .frame(width: 120, height: 120)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Theme.dividerColor)
                    .frame(width: 120, height: 120)
                    .overlay(
                        Image(systemName: "music.note")
                            .font(.system(size: 32))
                            .foregroundStyle(Theme.textMuted)
                    )
            }

            Text(songTitle)
                .font(Theme.dmSans(20, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
                .multilineTextAlignment(.center)

            if let artist = artistName {
                NavigationLink(value: ArtistDestination(name: artist)) {
                    Text(artist)
                        .font(Theme.dmSansItalic(15))
                        .foregroundStyle(Theme.accent)
                }
            }

            if let album = albumName {
                Text(album)
                    .font(Theme.dmSansItalic(13))
                    .foregroundStyle(Theme.textMuted)
                    .padding(.top, -8)
            }

            FollowButton(isFollowing: isFollowing) {
                if auth.isAuthenticated {
                    Task {
                        guard let userId = auth.userId else { return }
                        if isFollowing {
                            await followManager.unfollow(userId: userId, type: "song", value: songTitle)
                        } else {
                            await followManager.follow(userId: userId, type: "song", value: songTitle)
                        }
                    }
                } else {
                    authGate.showAuthSheet = true
                }
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    // MARK: - Feed

    private var feedSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("all saves")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.textSecondary)
                .padding(.horizontal, Theme.Spacing.md)

            searchSortBar

            ForEach(filteredClusters) { cluster in
                let lyric = cluster.representative
                ClusteredLyricCard(
                    cluster: cluster,
                    hasReacted: reactionStates[lyric.id] ?? false,
                    reactionCount: reactionCounts[lyric.id] ?? lyric.reactionCount ?? 0,
                    isResonateAnimating: animatingReactions.contains(lyric.id),
                    onResonate: { toggleReaction(for: lyric) },
                    onSave: { bookmarkLyricId = IdentifiableUUID(lyric.id) },
                    onShare: { shareLyric = lyric },
                    isSaved: collectionManager.isLyricSaved(lyric.id)
                )
                .padding(.horizontal, Theme.Spacing.md)
            }

            if filteredClusters.isEmpty && !isLoading {
                Text("No lyrics found")
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.textMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Theme.Spacing.lg)
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

    // MARK: - More From Artist

    private func moreFromArtistSection(artistName: String) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Text("more from \(artistName)")
                    .font(Theme.caveat(22))
                    .foregroundStyle(Theme.textSecondary)

                Spacer()

                NavigationLink(value: ArtistDestination(name: artistName)) {
                    Text("See all")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.accent)
                }
            }
            .padding(.horizontal, Theme.Spacing.md)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Spacing.md) {
                    ForEach(uniqueMoreFromArtist.prefix(10)) { lyric in
                        NavigationLink(value: SongDestination(
                            title: lyric.songTitle ?? "",
                            artistName: lyric.artistName,
                            coverArtUrl: lyric.coverArtUrl
                        )) {
                            moreFromArtistTile(lyric: lyric)
                        }
                    }
                }
                .padding(.horizontal, Theme.Spacing.md)
            }
        }
    }

    @ViewBuilder
    private func moreFromArtistTile(lyric: Lyric) -> some View {
        VStack(spacing: Theme.Spacing.xs) {
            if let url = lyric.coverArtUrl,
               let imageUrl = URL(string: url) {
                AsyncImage(url: imageUrl) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Theme.dividerColor)
                }
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            } else {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Theme.dividerColor)
                    .frame(width: 64, height: 64)
                    .overlay(
                        Image(systemName: "music.note")
                            .font(.system(size: 16))
                            .foregroundStyle(Theme.textMuted)
                    )
            }

            Text(lyric.songTitle ?? "")
                .font(Theme.dmSans(11))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(2)
                .frame(width: 64)
        }
    }

    // MARK: - Data

    private func fetchSongLyrics() async {
        isLoading = true
        do {
            let result: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .eq("is_public", value: true)
                .ilike("song_title", pattern: songTitle)
                .order("reaction_count", ascending: false)
                .limit(50)
                .execute()
                .value
            lyrics = result
        } catch {
            print("Fetch song lyrics error: \(error)")
        }
        isLoading = false
    }

    private func fetchMoreFromArtist(_ artist: String) async {
        do {
            let result: [Lyric] = try await supabase
                .from("lyrics")
                .select(Self.lyricColumns)
                .eq("is_public", value: true)
                .ilike("artist_name", pattern: artist)
                .order("reaction_count", ascending: false)
                .limit(20)
                .execute()
                .value
            moreFromArtist = result.filter {
                $0.songTitle?.caseInsensitiveCompare(songTitle) != .orderedSame
            }
        } catch {
            print("Fetch more from artist error: \(error)")
        }
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
