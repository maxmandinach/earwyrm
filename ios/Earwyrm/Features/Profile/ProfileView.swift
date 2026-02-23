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

    @Environment(CollectionManager.self) private var collectionManager

    private let tabs = ["lyrics", "resonated", "notes", "collections", "following"]

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Light.background
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
                            ProfileLyricsView(lyrics: viewModel.allLyrics)
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
                        withAnimation { proxy.scrollTo("profile-top", anchor: .top) }
                    }
                    } // ScrollViewReader
                }
            }
            .navigationDestination(for: LyricWithProfile.self) { item in
                ProfileLyricDetail(item: item)
            }
            .navigationDestination(for: Collection.self) { collection in
                CollectionDetailView(collection: collection)
            }
            .navigationDestination(for: ProfileDestination.self) { dest in
                PublicProfileView(userId: dest.userId, username: dest.username)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Text("earwyrm")
                        .font(Theme.caveat(24, weight: .semibold))
                        .foregroundStyle(Theme.Light.secondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Theme.Light.secondary)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
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
                .fill(Theme.Light.card)
                .frame(width: 72, height: 72)
                .overlay {
                    CaveatText(text: initials, size: 26, color: Theme.Light.accent)
                }

            // Username
            if let username = auth.profile?.username {
                Text("@\(username)")
                    .font(Theme.dmSans(18, weight: .medium))
                    .foregroundStyle(Theme.Light.text)
            }

            // Display name
            if let displayName = auth.profile?.displayName {
                Text(displayName)
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.Light.secondary)
            }

            // Follower / following counts (visible only to profile owner)
            HStack(spacing: Theme.Spacing.md) {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedTab = 4 }
                } label: {
                    Text("\(followerCount) followers")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.Light.muted)
                }
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedTab = 4 }
                } label: {
                    Text("\(followingCount) following")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.Light.muted)
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
                .fill(Theme.Light.divider)
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
                                 ? Theme.Light.text.opacity(0.7)
                                 : Theme.Light.text.opacity(0.3))
                .padding(.bottom, Theme.Spacing.sm)
                .overlay(alignment: .bottom) {
                    if selectedTab == tag {
                        Rectangle()
                            .fill(Theme.Light.text.opacity(0.4))
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
    @Environment(AuthManager.self) private var auth

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.Spacing.lg) {
                LyricCardView(
                    lyric: item.lyric,
                    hero: true,
                    showActions: false,
                    isPublic: item.lyric.isPublic ?? false,
                    isOwn: false,
                    hasReacted: false,
                    reactionCount: item.lyric.reactionCount ?? 0,
                    isResonateAnimating: false,
                    commentCount: item.lyric.commentCount ?? 0,
                    showComments: false,
                    currentUserId: auth.userId
                )
                .padding(.horizontal, Theme.Spacing.md)

                if let username = item.username {
                    Text("posted by @\(username)")
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.Light.secondary)
                }
            }
            .padding(.top, Theme.Spacing.md)
        }
        .background(Theme.Light.background)
        .navigationBarTitleDisplayMode(.inline)
    }
}
