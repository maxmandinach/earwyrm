import SwiftUI
import Supabase

struct SongPageView: View {
    let songTitle: String
    let artistName: String?
    let coverArtUrl: String?

    @Environment(AuthManager.self) private var auth
    @Environment(AuthGate.self) private var authGate
    @Environment(FollowManager.self) private var followManager

    @State private var lyrics: [Lyric] = []
    @State private var moreFromArtist: [Lyric] = []
    @State private var isLoading = true

    private var isFollowing: Bool {
        followManager.isFollowing(type: "song", value: songTitle)
    }

    private var mostSavedLine: Lyric? {
        lyrics.max(by: { ($0.reactionCount ?? 0) < ($1.reactionCount ?? 0) })
    }

    private var totalResonations: Int {
        lyrics.reduce(0) { $0 + ($1.reactionCount ?? 0) }
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
                    statsRow

                    // Most saved line hero
                    if let top = mostSavedLine, (top.reactionCount ?? 0) > 0 {
                        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                            Text("most saved line")
                                .font(Theme.caveat(22))
                                .foregroundStyle(Theme.Light.secondary)
                                .padding(.horizontal, Theme.Spacing.md)

                            LyricCardView(lyric: top, hero: false)
                                .padding(.horizontal, Theme.Spacing.md)
                        }
                    }

                    // All saves (clustered feed)
                    if lyrics.count > 1 {
                        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                            Text("all saves")
                                .font(Theme.caveat(22))
                                .foregroundStyle(Theme.Light.secondary)
                                .padding(.horizontal, Theme.Spacing.md)

                            let remaining = lyrics.filter { $0.id != mostSavedLine?.id }
                            ForEach(remaining) { lyric in
                                CompactLyricCard(lyric: lyric)
                                    .padding(.horizontal, Theme.Spacing.md)
                            }
                        }
                    }

                    // More from artist
                    if let artist = artistName, !uniqueMoreFromArtist.isEmpty {
                        moreFromArtistSection(artistName: artist)
                    }
                }
                .padding(.vertical, Theme.Spacing.md)
            }
        }
        .background(Theme.Light.background)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await fetchSongLyrics()
            if let artist = artistName {
                await fetchMoreFromArtist(artist)
            }
        }
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: Theme.Spacing.lg) {
            RoundedRectangle(cornerRadius: 12)
                .fill(Theme.Light.divider)
                .frame(width: 120, height: 120)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.Light.divider)
                .frame(width: 160, height: 20)
            RoundedRectangle(cornerRadius: 4)
                .fill(Theme.Light.divider)
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
                        .fill(Theme.Light.divider)
                }
                .frame(width: 120, height: 120)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Theme.Light.divider)
                    .frame(width: 120, height: 120)
                    .overlay(
                        Image(systemName: "music.note")
                            .font(.system(size: 32))
                            .foregroundStyle(Theme.Light.muted)
                    )
            }

            Text(songTitle)
                .font(Theme.dmSans(20, weight: .semibold))
                .foregroundStyle(Theme.Light.text)
                .multilineTextAlignment(.center)

            if let artist = artistName {
                NavigationLink(value: ArtistDestination(name: artist)) {
                    Text(artist)
                        .font(Theme.dmSansItalic(15))
                        .foregroundStyle(Theme.Light.accent)
                }
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

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: Theme.Spacing.xl) {
            VStack(spacing: 2) {
                Text("\(lyrics.count)")
                    .font(Theme.dmSans(18, weight: .semibold))
                    .foregroundStyle(Theme.Light.text)
                Text("saves")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.Light.muted)
            }
            VStack(spacing: 2) {
                Text("\(totalResonations)")
                    .font(Theme.dmSans(18, weight: .semibold))
                    .foregroundStyle(Theme.Light.text)
                Text("resonations")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.Light.muted)
            }
        }
    }

    // MARK: - More From Artist

    private func moreFromArtistSection(artistName: String) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Text("more from \(artistName)")
                    .font(Theme.caveat(22))
                    .foregroundStyle(Theme.Light.secondary)

                Spacer()

                NavigationLink(value: ArtistDestination(name: artistName)) {
                    Text("See all")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.Light.accent)
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
                            VStack(spacing: Theme.Spacing.xs) {
                                if let url = lyric.coverArtUrl,
                                   let imageUrl = URL(string: url) {
                                    AsyncImage(url: imageUrl) { image in
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        RoundedRectangle(cornerRadius: 6)
                                            .fill(Theme.Light.divider)
                                    }
                                    .frame(width: 64, height: 64)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                                } else {
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(Theme.Light.divider)
                                        .frame(width: 64, height: 64)
                                        .overlay(
                                            Image(systemName: "music.note")
                                                .font(.system(size: 16))
                                                .foregroundStyle(Theme.Light.muted)
                                        )
                                }

                                Text(lyric.songTitle ?? "")
                                    .font(Theme.dmSans(11))
                                    .foregroundStyle(Theme.Light.text)
                                    .lineLimit(2)
                                    .frame(width: 64)
                            }
                        }
                    }
                }
                .padding(.horizontal, Theme.Spacing.md)
            }
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
            // Exclude current song
            moreFromArtist = result.filter {
                $0.songTitle?.caseInsensitiveCompare(songTitle) != .orderedSame
            }
        } catch {
            print("Fetch more from artist error: \(error)")
        }
    }
}
