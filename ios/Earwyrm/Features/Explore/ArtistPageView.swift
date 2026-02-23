import SwiftUI
import Supabase

struct ArtistPageView: View {
    let artistName: String

    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager

    @State private var lyrics: [Lyric] = []
    @State private var isLoading = true
    @State private var search = ""
    @State private var sort: SortOption = .newest

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

    private var totalResonations: Int {
        lyrics.reduce(0) { $0 + ($1.reactionCount ?? 0) }
    }

    private var mostSavedLine: Lyric? {
        lyrics.max(by: { ($0.reactionCount ?? 0) < ($1.reactionCount ?? 0) })
    }

    private var filteredLyrics: [Lyric] {
        var result = lyrics
        if !search.isEmpty {
            let q = search.lowercased()
            result = result.filter {
                $0.content.lowercased().contains(q)
                || ($0.songTitle?.lowercased().contains(q) ?? false)
            }
        }
        switch sort {
        case .newest:
            return result.sorted { $0.createdAt > $1.createdAt }
        case .resonated:
            return result.sorted { ($0.reactionCount ?? 0) > ($1.reactionCount ?? 0) }
        case .discussed:
            return result.sorted { ($0.commentCount ?? 0) > ($1.commentCount ?? 0) }
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
                    statsRow

                    if !uniqueSongs.isEmpty {
                        songsList
                    }

                    if let top = mostSavedLine, (top.reactionCount ?? 0) > 0 {
                        mostSavedSection(lyric: top)
                    }

                    feedSection
                }
                .padding(.vertical, Theme.Spacing.md)
            }
        }
        .background(Theme.Light.background)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await fetchArtistLyrics()
        }
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Circle()
                .fill(Theme.Light.divider)
                .frame(width: 80, height: 80)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.Light.divider)
                .frame(width: 140, height: 20)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.Light.divider)
                .frame(width: 80, height: 14)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Theme.Spacing.xxl)
        .redacted(reason: .placeholder)
    }

    // MARK: - Header

    private var artistHeader: some View {
        VStack(spacing: Theme.Spacing.md) {
            // Use first cover art from their lyrics, or initial
            if let firstCover = lyrics.first(where: { $0.coverArtUrl != nil })?.coverArtUrl,
               let url = URL(string: firstCover) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Theme.Light.accent.opacity(0.3))
                        .overlay(
                            CaveatText(text: String(artistName.prefix(1)).uppercased(), size: 36, weight: .bold, color: Theme.Light.text)
                        )
                }
                .frame(width: 80, height: 80)
                .clipShape(Circle())
                .shadow(color: .black.opacity(0.1), radius: 6, y: 2)
            } else {
                Circle()
                    .fill(Theme.Light.accent.opacity(0.3))
                    .frame(width: 80, height: 80)
                    .overlay(
                        CaveatText(text: String(artistName.prefix(1)).uppercased(), size: 36, weight: .bold, color: Theme.Light.text)
                    )
            }

            Text(artistName)
                .font(Theme.dmSans(22, weight: .semibold))
                .foregroundStyle(Theme.Light.text)

            FollowButton(isFollowing: isFollowing) {
                Task {
                    guard let userId = auth.userId else { return }
                    if isFollowing {
                        await followManager.unfollow(userId: userId, type: "artist", value: artistName)
                    } else {
                        await followManager.follow(userId: userId, type: "artist", value: artistName)
                    }
                }
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: Theme.Spacing.xl) {
            statItem(value: "\(lyrics.count)", label: "saves")
            statItem(value: "\(uniqueSongs.count)", label: "songs")
            statItem(value: "\(totalResonations)", label: "resonations")
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(Theme.dmSans(18, weight: .semibold))
                .foregroundStyle(Theme.Light.text)
            Text(label)
                .font(Theme.dmSans(12))
                .foregroundStyle(Theme.Light.muted)
        }
    }

    // MARK: - Songs

    private var songsList: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("songs")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.Light.secondary)
                .padding(.horizontal, Theme.Spacing.md)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Spacing.md) {
                    ForEach(uniqueSongs, id: \.title) { song in
                        NavigationLink(value: SongDestination(
                            title: song.title,
                            artistName: artistName,
                            coverArtUrl: song.coverArt
                        )) {
                            VStack(spacing: Theme.Spacing.sm) {
                                if let url = song.coverArt,
                                   let imageUrl = URL(string: url) {
                                    AsyncImage(url: imageUrl) { image in
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(Theme.Light.divider)
                                    }
                                    .frame(width: 80, height: 80)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                } else {
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(Theme.Light.divider)
                                        .frame(width: 80, height: 80)
                                        .overlay(
                                            Image(systemName: "music.note")
                                                .foregroundStyle(Theme.Light.muted)
                                        )
                                }

                                Text(song.title)
                                    .font(Theme.dmSans(12))
                                    .foregroundStyle(Theme.Light.text)
                                    .lineLimit(2)
                                    .frame(width: 80)

                                Text("\(song.count) save\(song.count == 1 ? "" : "s")")
                                    .font(Theme.dmSans(11))
                                    .foregroundStyle(Theme.Light.muted)
                            }
                        }
                    }
                }
                .padding(.horizontal, Theme.Spacing.md)
            }
        }
    }

    // MARK: - Most Saved

    private func mostSavedSection(lyric: Lyric) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("most saved line")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.Light.secondary)
                .padding(.horizontal, Theme.Spacing.md)

            CompactLyricCard(lyric: lyric)
                .padding(.horizontal, Theme.Spacing.md)
        }
    }

    // MARK: - Feed

    private var feedSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("recent saves")
                .font(Theme.caveat(22))
                .foregroundStyle(Theme.Light.secondary)
                .padding(.horizontal, Theme.Spacing.md)

            // Search + sort
            HStack(spacing: Theme.Spacing.sm) {
                HStack(spacing: Theme.Spacing.sm) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.Light.muted)
                    TextField("Search lyrics...", text: $search)
                        .font(Theme.dmSans(13))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(Theme.Light.card)
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
                        .foregroundStyle(Theme.Light.secondary)
                        .frame(width: 36, height: 36)
                        .background(Theme.Light.card)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(.horizontal, Theme.Spacing.md)

            ForEach(filteredLyrics) { lyric in
                CompactLyricCard(lyric: lyric)
                    .padding(.horizontal, Theme.Spacing.md)
            }

            if filteredLyrics.isEmpty && !isLoading {
                Text("No lyrics found")
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.Light.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Theme.Spacing.lg)
            }
        }
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
