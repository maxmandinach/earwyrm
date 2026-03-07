import SwiftUI

struct ProfileView: View {
    var scrollToTop: Bool = false
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager
    @Environment(UserFollowManager.self) private var userFollowManager
    @State private var viewModel = ProfileViewModel()
    @State private var selectedTab = 0
    @State private var showSettings = false
    @State private var followerCount: Int = 0
    @State private var followingCount: Int = 0
    @State private var navigationPath = NavigationPath()

    @Environment(CollectionManager.self) private var collectionManager

    private let tabs = ["lyrics", "resonated", "notes", "collections", "following"]

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ZStack {
                Theme.background
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Profile header
                    profileHeader
                        .padding(.top, Theme.Spacing.md)
                        .padding(.bottom, Theme.Spacing.md)

                    // Underline tab bar
                    tabBar
                        .padding(.bottom, Theme.Spacing.sm)

                    // Tab content
                    ScrollViewReader { proxy in
                    ScrollView {
                        Color.clear.frame(height: 0).id("profile-top")
                        switch selectedTab {
                        case 0:
                            ProfileLyricsView(
                                currentLyrics: viewModel.currentLyrics,
                                pastLyrics: viewModel.pastLyrics,
                                onLyricUpdated: { Task { if let userId = auth.userId { await viewModel.loadAll(userId: userId) } } }
                            )
                        case 1:
                            ProfileResonatedView(resonatedLyrics: viewModel.resonatedLyrics)
                        case 2:
                            ProfileNotesView(notes: viewModel.notes)
                        case 3:
                            ProfileCollectionsView()
                        case 4:
                            ProfileFollowingView()
                        default:
                            EmptyView()
                        }

                        // Bottom padding
                        Spacer().frame(height: Theme.Spacing.xl)
                    }
                    .refreshable {
                        if let userId = auth.userId {
                            await viewModel.loadAll(userId: userId)
                            await followManager.fetchFollows(userId: userId)
                        }
                    }
                    .onChange(of: scrollToTop) { _, _ in
                        if !navigationPath.isEmpty {
                            navigationPath = NavigationPath()
                        } else {
                            withAnimation { proxy.scrollTo("profile-top", anchor: .top) }
                        }
                    }
                    } // ScrollViewReader
                }
            }
            .navigationDestination(for: LyricWithProfile.self) { item in
                ProfileLyricDetail(
                    item: item,
                    onLyricUpdated: { Task { if let userId = auth.userId { await viewModel.loadAll(userId: userId) } } }
                )
            }
            .navigationDestination(for: Collection.self) { collection in
                CollectionDetailView(collection: collection)
            }
            .navigationDestination(for: ProfileDestination.self) { dest in
                PublicProfileView(userId: dest.userId, username: dest.username)
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
            .earwyrmBranding()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
            }
            // Nav bar appearance handled globally (opaque bg, no shadow line)
        }
        .task {
            if let userId = auth.userId {
                await viewModel.loadAll(userId: userId)
                await followManager.fetchFollows(userId: userId)
                await collectionManager.fetchCollections(userId: userId)
                let counts = await userFollowManager.fetchCounts(userId: userId)
                followerCount = counts.followers
                followingCount = counts.following
            }
        }
        .onChange(of: showSettings) { _, show in
            if show { Analytics.track(.screenView, ["screen": "settings"]) }
        }
        .sheet(isPresented: $showSettings) {
            ProfileSettingsSheet()
                .environment(auth)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
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
            if let username = auth.profile?.username {
                Text("@\(username)")
                    .font(Theme.dmSans(18, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
            }

            // Display name
            if let displayName = auth.profile?.displayName {
                Text(displayName)
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.textSecondary)
            }

            // Follower / following counts (visible only to profile owner)
            HStack(spacing: Theme.Spacing.md) {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedTab = 4 }
                } label: {
                    Text("\(followerCount) followers")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textMuted)
                }
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedTab = 4 }
                } label: {
                    Text("\(followingCount) following")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textMuted)
                }
            }
        }
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
        HStack(spacing: Theme.Spacing.md) {
            ForEach(Array(tabs.enumerated()), id: \.offset) { index, title in
                tabButton(title, tag: index)
            }
        }
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Theme.dividerColor)
                .frame(height: 0.5)
        }
        .padding(.horizontal, Theme.Spacing.md)
    }

    private func tabButton(_ title: String, tag: Int) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedTab = tag
            }
            Haptics.light()
        } label: {
            Text(title)
                .font(Theme.dmSans(13))
                .foregroundStyle(selectedTab == tag
                                 ? Theme.textPrimary.opacity(0.7)
                                 : Theme.textPrimary.opacity(0.3))
                .padding(.bottom, Theme.Spacing.sm)
                .overlay(alignment: .bottom) {
                    if selectedTab == tag {
                        Rectangle()
                            .fill(Theme.textPrimary.opacity(0.4))
                            .frame(height: 1)
                    }
                }
        }
    }

    // MARK: - Helpers

    private var initials: String {
        guard let username = auth.profile?.username, let first = username.first else { return "?" }
        return String(first).uppercased()
    }
}

// MARK: - Lyric Detail Destination

private struct ProfileLyricDetail: View {
    let item: LyricWithProfile
    var onLyricUpdated: (() -> Void)?

    @Environment(AuthManager.self) private var auth
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(ToastManager.self) private var toastManager
    @Environment(\.dismiss) private var dismiss

    @State private var resonateVM: ResonateViewModel?
    @State private var showComments = false
    @State private var showShareModal = false
    @State private var bookmarkLyricId: IdentifiableUUID?
    @State private var showPostSheet = false
    @State private var showEditSheet = false
    @State private var isMakingCurrent = false

    private var lyric: Lyric { item.lyric }
    private var isOwn: Bool { lyric.userId == auth.userId }
    private var isCurrent: Bool { lyric.isCurrent == true }

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.Spacing.lg) {
                LyricCardView(
                    lyric: lyric,
                    hero: true,
                    showActions: true,
                    isPublic: lyric.isPublic ?? false,
                    isOwn: isOwn,
                    onShare: { showShareModal = true },
                    onReplace: isCurrent ? { showPostSheet = true } : {},
                    onEdit: isCurrent ? { showEditSheet = true } : {},
                    onVisibilityChange: { newValue in toggleVisibility(isPublic: newValue) },
                    hasReacted: resonateVM?.hasReacted ?? false,
                    reactionCount: resonateVM?.count ?? (lyric.reactionCount ?? 0),
                    isResonateAnimating: resonateVM?.isAnimating ?? false,
                    onResonate: { resonateVM?.toggle() },
                    commentCount: lyric.commentCount ?? 0,
                    showComments: showComments,
                    onToggleComments: { showComments.toggle() },
                    onSave: { bookmarkLyricId = IdentifiableUUID(lyric.id) },
                    isSaved: collectionManager.isLyricSaved(lyric.id),
                    currentUserId: auth.userId
                )
                .padding(.horizontal, Theme.Spacing.md)

                if let username = item.username {
                    NavigationLink(value: ProfileDestination(userId: lyric.userId, username: username)) {
                        Text("posted by @\(username)")
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.accent)
                    }
                }

                // "Make current" button for past lyrics owned by user
                if !isCurrent && isOwn {
                    Button {
                        Task { await makeCurrent() }
                    } label: {
                        HStack(spacing: 6) {
                            if isMakingCurrent {
                                ProgressView()
                                    .tint(.white)
                                    .scaleEffect(0.8)
                            }
                            Text("make current")
                                .font(Theme.dmSans(14, weight: .medium))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .background(Theme.accent)
                        .clipShape(Capsule())
                    }
                    .disabled(isMakingCurrent)
                }
            }
            .padding(.top, Theme.Spacing.md)
        }
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard let userId = auth.userId else { return }
            resonateVM = ResonateViewModel(
                lyricId: lyric.id,
                userId: userId,
                initialCount: lyric.reactionCount ?? 0,
                toast: toastManager
            )
            await resonateVM?.checkInitialState()
        }
        .sheet(isPresented: $showShareModal) {
            ShareModalView(
                lyric: lyric,
                note: nil,
                username: auth.profile?.username
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
            .presentationBackground(Theme.background)
        }
        .sheet(item: $bookmarkLyricId) { item in
            CollectionPickerSheet(lyricId: item.value)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .fullScreenCover(isPresented: $showPostSheet) {
            PostLyricView(
                currentLyricId: lyric.id,
                onSaved: {
                    onLyricUpdated?()
                    dismiss()
                }
            )
            .environment(auth)
        }
        .sheet(isPresented: $showEditSheet) {
            EditLyricView(lyric: lyric) {
                onLyricUpdated?()
            }
            .interactiveDismissDisabled()
            .presentationDragIndicator(.visible)
        }
        .navigationDestination(for: ProfileDestination.self) { dest in
            PublicProfileView(userId: dest.userId, username: dest.username)
        }
        .navigationDestination(for: ArtistDestination.self) { dest in
            ArtistPageView(artistName: dest.name)
        }
        .navigationDestination(for: SongDestination.self) { dest in
            SongPageView(songTitle: dest.title, artistName: dest.artistName, coverArtUrl: dest.coverArtUrl)
        }
    }

    // MARK: - Actions

    private func toggleVisibility(isPublic: Bool) {
        Task {
            do {
                try await supabase
                    .from("lyrics")
                    .update(LyricVisibilityUpdate(isPublic: isPublic))
                    .eq("id", value: lyric.id.uuidString)
                    .execute()
                Haptics.light()
                onLyricUpdated?()
            } catch {
                toastManager.show("couldn't update visibility")
            }
        }
    }

    private func makeCurrent() async {
        guard let userId = auth.userId else { return }
        isMakingCurrent = true
        do {
            // 1. Archive any existing current lyric
            try await supabase
                .from("lyrics")
                .update(LyricArchiveUpdate(
                    isCurrent: false,
                    replacedAt: ISO8601DateFormatter().string(from: Date())
                ))
                .eq("user_id", value: userId.uuidString)
                .eq("is_current", value: true)
                .execute()

            // 2. Insert new lyric as current with same content
            let insert = LyricInsert(
                userId: userId,
                content: lyric.content,
                songTitle: lyric.songTitle,
                artistName: lyric.artistName,
                coverArtUrl: lyric.coverArtUrl,
                cardArtUrl: lyric.cardArtUrl,
                albumName: lyric.albumName,
                tags: lyric.tags,
                isPublic: lyric.isPublic ?? false,
                isCurrent: true,
                canonicalLyricId: lyric.canonicalLyricId,
                musicbrainzRecordingId: lyric.musicbrainzRecordingId,
                musicbrainzReleaseId: lyric.musicbrainzReleaseId
            )
            try await supabase
                .from("lyrics")
                .insert(insert)
                .execute()

            Haptics.medium()
            toastManager.show("lyric is now current")
            onLyricUpdated?()
            dismiss()
        } catch {
            toastManager.show("couldn't make current, try again")
            print("Make current error: \(error)")
        }
        isMakingCurrent = false
    }
}
