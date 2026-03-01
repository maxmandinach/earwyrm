import SwiftUI
import Supabase

// MARK: - Navigation Destination

struct ProfileDestination: Hashable {
    let userId: UUID
    let username: String
}

// MARK: - Public Profile View

struct PublicProfileView: View {
    let userId: UUID
    let username: String

    @Environment(AuthManager.self) private var auth
    @Environment(UserFollowManager.self) private var userFollowManager
    @Environment(NotificationManager.self) private var notificationManager
    @Environment(BlockManager.self) private var blockManager
    @State private var profile: Profile?
    @State private var lyrics: [Lyric] = []
    @State private var isLoading = true
    @State private var shareLyric: Lyric?
    @State private var showBlockAlert = false

    private var isOwnProfile: Bool {
        auth.userId == userId
    }

    private var showFollowButton: Bool {
        !isOwnProfile && (profile?.isPublic ?? false)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.Spacing.lg) {
                // Profile header
                profileHeader
                    .padding(.top, Theme.Spacing.md)

                // Lyrics list
                if isLoading {
                    ProgressView()
                        .tint(Theme.accent)
                        .padding(.top, Theme.Spacing.xl)
                } else if lyrics.isEmpty {
                    VStack(spacing: Theme.Spacing.sm) {
                        Text("no public lyrics yet")
                            .font(Theme.caveat(22))
                            .foregroundStyle(Theme.textSecondary)
                    }
                    .padding(.top, Theme.Spacing.xl)
                } else {
                    LazyVStack(spacing: Theme.Spacing.md) {
                        ForEach(lyrics) { lyric in
                            PublicProfileLyricCard(
                                lyric: lyric,
                                onShare: { shareLyric = lyric }
                            )
                            .padding(.horizontal, Theme.Spacing.md)
                        }
                    }
                }

                Spacer().frame(height: 100)
            }
        }
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if !isOwnProfile && auth.userId != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if blockManager.isBlocked(userId) {
                            Button {
                                guard let currentUserId = auth.userId else { return }
                                Task {
                                    await blockManager.unblock(currentUserId: currentUserId, targetUserId: userId)
                                }
                            } label: {
                                Label("Unblock @\(username)", systemImage: "hand.raised.slash")
                            }
                        } else {
                            Button(role: .destructive) {
                                showBlockAlert = true
                            } label: {
                                Label("Block @\(username)", systemImage: "hand.raised")
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Theme.textMuted)
                    }
                }
            }
        }
        .alert(
            "Block @\(username)?",
            isPresented: $showBlockAlert
        ) {
            Button("Block", role: .destructive) {
                guard let currentUserId = auth.userId else { return }
                Task {
                    await blockManager.block(currentUserId: currentUserId, targetUserId: userId)
                }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Their content will be hidden from your feeds. You can unblock from Settings.")
        }
        .navigationDestination(for: ArtistDestination.self) { dest in
            ArtistPageView(artistName: dest.name)
        }
        .navigationDestination(for: SongDestination.self) { dest in
            SongPageView(
                songTitle: dest.title,
                artistName: dest.artistName,
                coverArtUrl: dest.coverArtUrl
            )
        }
        .task {
            Analytics.track(.screenView, ["screen": "public_profile"])
            await loadProfile()
            await loadLyrics()
        }
        .sheet(item: $shareLyric) { lyric in
            ShareModalView(
                lyric: lyric,
                note: nil,
                username: username,
                onShareCompleted: {
                    Task {
                        guard let actorId = auth.userId,
                              let actorUsername = auth.profile?.username else { return }
                        await notificationManager.sendShareNotification(
                            lyricOwnerId: userId,
                            actorId: actorId,
                            actorUsername: actorUsername,
                            lyric: lyric
                        )
                    }
                }
            )
            .presentationDetents([.large])
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        VStack(spacing: Theme.Spacing.sm) {
            // Avatar
            Circle()
                .fill(Theme.card)
                .frame(width: 72, height: 72)
                .overlay {
                    CaveatText(text: initials, size: 26, color: Theme.accent)
                }

            // Username
            Text("@\(username)")
                .font(Theme.dmSans(18, weight: .medium))
                .foregroundStyle(Theme.textPrimary)

            // Display name
            if let displayName = profile?.displayName {
                Text(displayName)
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.textSecondary)
            }

            // Follow button — only for public profiles, not own
            if showFollowButton {
                UserFollowButton(targetUserId: userId)
                    .padding(.top, Theme.Spacing.xs)
            }
        }
    }

    // MARK: - Helpers

    private var initials: String {
        guard let first = username.first else { return "?" }
        return String(first).uppercased()
    }

    private func loadProfile() async {
        do {
            let result: Profile = try await supabase
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value
            profile = result
        } catch {
            print("Load public profile error: \(error)")
        }
    }

    private func loadLyrics() async {
        isLoading = true
        do {
            let result: [Lyric] = try await supabase
                .from("lyrics")
                .select(HomeViewModel.lyricColumns)
                .eq("user_id", value: userId.uuidString)
                .eq("is_public", value: true)
                .order("created_at", ascending: false)
                .execute()
                .value
            lyrics = result
        } catch {
            print("Load public profile lyrics error: \(error)")
        }
        isLoading = false
    }
}

// MARK: - Compact Lyric Card for Public Profile

private struct PublicProfileLyricCard: View {
    let lyric: Lyric
    var onShare: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Lyric content
            Text(lyric.content)
                .font(Theme.caveat(24, weight: .medium))
                .foregroundStyle(Theme.textPrimary)
                .lineSpacing(6)
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Song / Artist
            if lyric.songTitle != nil || lyric.artistName != nil {
                HStack(spacing: 4) {
                    if let song = lyric.songTitle {
                        NavigationLink(value: SongDestination(
                            title: song,
                            artistName: lyric.artistName,
                            coverArtUrl: lyric.coverArtUrl
                        )) {
                            Text(song)
                                .font(Theme.dmSansItalic(13))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                    if lyric.songTitle != nil && lyric.artistName != nil {
                        Text("—")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.textMuted)
                    }
                    if let artist = lyric.artistName {
                        NavigationLink(value: ArtistDestination(name: artist)) {
                            Text(artist)
                                .font(Theme.dmSansItalic(13))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                }
            }

            // Counts row
            HStack(spacing: Theme.Spacing.md) {
                HStack(spacing: 4) {
                    ResonateIcon(isActive: false, isAnimating: false, size: 14)
                    Text("\(lyric.reactionCount ?? 0)")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                }

                HStack(spacing: 4) {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.textMuted)
                    Text("\(lyric.commentCount ?? 0)")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                }

                Spacer()

                if let onShare {
                    Button(action: onShare) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Theme.textMuted)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                }

                Text(relativeDate(lyric.createdAt))
                    .font(Theme.dmSans(11))
                    .foregroundStyle(Theme.textMuted)
                    .opacity(0.7)
            }
        }
        .padding(Theme.Spacing.md)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }

    private func relativeDate(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "just now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        if interval < 86400 { return "\(Int(interval / 3600))h ago" }
        if interval < 604800 { return "\(Int(interval / 86400))d ago" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

// Make Lyric Identifiable for .sheet(item:)
extension Lyric: @retroactive Equatable {
    static func == (lhs: Lyric, rhs: Lyric) -> Bool { lhs.id == rhs.id }
}
