import SwiftUI

struct ExploreSearchResultsView: View {
    let searchVM: ExploreSearchViewModel
    let query: String

    var body: some View {
        LazyVStack(alignment: .leading, spacing: Theme.Spacing.lg) {
            // Songs (Genius)
            if searchVM.isSongsLoading || !searchVM.songResults.isEmpty {
                songsSection
            }

            // Artists (MusicBrainz)
            if searchVM.isArtistsLoading || !searchVM.artistResults.isEmpty {
                artistsSection
            }

            // Earwyrms (Supabase lyrics)
            if searchVM.isLyricsLoading || !searchVM.lyricResults.isEmpty {
                lyricsSection
            }

            // Empty state
            if searchVM.hasNoResults {
                VStack(spacing: Theme.Spacing.sm) {
                    CaveatText(text: "no results", size: 22, color: Theme.textSecondary)
                    Text("nothing matched \"\(query)\"")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, Theme.Spacing.xl)
            }
        }
        .padding(.top, Theme.Spacing.sm)
    }

    // MARK: - Songs Section

    private var songsSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            CaveatText(text: "songs", size: 22, color: Theme.textSecondary)
                .padding(.horizontal, Theme.Spacing.md)

            if searchVM.isSongsLoading && searchVM.songResults.isEmpty {
                sectionShimmer
            } else {
                ForEach(searchVM.songResults) { song in
                    NavigationLink(value: SongDestination(
                        title: song.title,
                        artistName: song.artist,
                        coverArtUrl: song.albumArt
                    )) {
                        songRow(song)
                    }
                }
            }
        }
    }

    private func songRow(_ song: GeniusSuggestion) -> some View {
        HStack(spacing: 12) {
            if let urlStr = song.albumArt, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Theme.dividerColor)
                }
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            } else {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Theme.dividerColor)
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "music.note")
                            .font(.system(size: 16))
                            .foregroundStyle(Theme.textMuted)
                    )
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(song.title)
                    .font(Theme.dmSans(15, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
                if let artist = song.artist {
                    Text(artist)
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textSecondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundStyle(Theme.textMuted)
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.vertical, 6)
        .contentShape(Rectangle())
    }

    // MARK: - Artists Section

    private var artistsSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            CaveatText(text: "artists", size: 22, color: Theme.textSecondary)
                .padding(.horizontal, Theme.Spacing.md)

            if searchVM.isArtistsLoading && searchVM.artistResults.isEmpty {
                sectionShimmer
            } else {
                ForEach(searchVM.artistResults) { artist in
                    NavigationLink(value: ArtistDestination(name: artist.name)) {
                        artistRow(artist)
                    }
                }
            }
        }
    }

    private func artistRow(_ artist: MBArtist) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Theme.accent.opacity(0.3))
                .frame(width: 44, height: 44)
                .overlay(
                    CaveatText(
                        text: String(artist.name.prefix(1)).uppercased(),
                        size: 22,
                        weight: .bold,
                        color: Theme.textPrimary
                    )
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(artist.name)
                    .font(Theme.dmSans(15, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)

                if let detail = artistDetail(artist) {
                    Text(detail)
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textMuted)
                        .lineLimit(1)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundStyle(Theme.textMuted)
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.vertical, 6)
        .contentShape(Rectangle())
    }

    private func artistDetail(_ artist: MBArtist) -> String? {
        let parts = [artist.disambiguation, artist.country].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    // MARK: - Lyrics Section

    private var lyricsSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            CaveatText(text: "earwyrms", size: 22, color: Theme.textSecondary)
                .padding(.horizontal, Theme.Spacing.md)

            if searchVM.isLyricsLoading && searchVM.lyricResults.isEmpty {
                sectionShimmer
            } else {
                ForEach(searchVM.lyricResults) { lyric in
                    lyricRow(lyric)
                }
            }
        }
    }

    private func lyricRow(_ lyric: Lyric) -> some View {
        NavigationLink(value: SongDestination(
            title: lyric.songTitle ?? "",
            artistName: lyric.artistName,
            coverArtUrl: lyric.coverArtUrl
        )) {
            VStack(alignment: .leading, spacing: 6) {
                Text(lyric.content)
                    .font(Theme.caveat(18))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                HStack(spacing: 4) {
                    if let song = lyric.songTitle {
                        Text(song)
                            .font(Theme.dmSans(12, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)
                    }
                    if let artist = lyric.artistName {
                        Text("· \(artist)")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.textMuted)
                    }
                }

                if let username = searchVM.lyricProfileMap[lyric.userId] {
                    Text("@\(username)")
                        .font(Theme.dmSans(11))
                        .foregroundStyle(Theme.textMuted)
                }
            }
            .padding(Theme.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal, Theme.Spacing.md)
        }
    }

    // MARK: - Shimmer

    private var sectionShimmer: some View {
        VStack(spacing: Theme.Spacing.sm) {
            ForEach(0..<2, id: \.self) { _ in
                HStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Theme.dividerColor)
                        .frame(width: 44, height: 44)
                    VStack(alignment: .leading, spacing: 4) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Theme.dividerColor)
                            .frame(width: 120, height: 14)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Theme.dividerColor)
                            .frame(width: 80, height: 12)
                    }
                    Spacer()
                }
                .padding(.horizontal, Theme.Spacing.md)
            }
            .redacted(reason: .placeholder)
        }
    }
}
