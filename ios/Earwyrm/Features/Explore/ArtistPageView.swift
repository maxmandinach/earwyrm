import SwiftUI
import Supabase

struct ArtistPageView: View {
    let artistName: String

    @Environment(AuthManager.self) private var auth
    @Environment(AuthGate.self) private var authGate
    @Environment(FollowManager.self) private var followManager

    @State private var lyrics: [Lyric] = []
    @State private var isLoading = true
    @State private var search = ""
    @State private var sort: SortOption = .newest
    @State private var showPageShare = false

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
        reaction_count, comment_count, created_at, replaced_at
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
                .padding(.vertical, Theme.Spacing.md)
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
        }
        .task {
            await fetchArtistLyrics()
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
                AsyncImage(url: url) { image in
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
                AsyncImage(url: imageUrl) { image in
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

            ForEach(filteredClusters) { cluster in
                ClusteredLyricCard(cluster: cluster)
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
}
