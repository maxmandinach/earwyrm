import SwiftUI

// MARK: - Navigation Destinations

struct ArtistDestination: Hashable {
    let name: String
}

struct SongDestination: Hashable {
    let title: String
    let artistName: String?
    let coverArtUrl: String?
}

// MARK: - Explore View

struct ExploreView: View {
    var scrollToTop: Bool = false
    @Environment(AuthManager.self) private var auth
    @Environment(AuthGate.self) private var authGate
    @Environment(FollowManager.self) private var followManager
    @Environment(NotificationManager.self) private var notificationManager
    @State private var viewModel = ExploreViewModel()
    @State private var selectedTab = 0
    @State private var shareLyric: Lyric?
    @State private var shareUsername: String?
    @State private var shareOwnerId: UUID?
    @State private var navigationPath = NavigationPath()

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ZStack {
                Theme.background
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Underline tab bar
                    tabBar
                        .padding(.top, Theme.Spacing.xs)
                        .padding(.bottom, Theme.Spacing.sm)

                    // Content
                    ScrollViewReader { proxy in
                    ScrollView {
                        Color.clear.frame(height: 0).id("explore-top")
                        if selectedTab == 0 {
                            ExploreForYouView(viewModel: viewModel) { lyric, username in
                                shareLyric = lyric
                                shareUsername = username
                                shareOwnerId = lyric.userId
                            }
                        } else if auth.isAuthenticated {
                            ExploreFollowingView(viewModel: viewModel) { lyric, username in
                                shareLyric = lyric
                                shareUsername = username
                                shareOwnerId = lyric.userId
                            }
                        }
                        Spacer().frame(height: 80)
                    }
                    .refreshable {
                        await viewModel.fetchPublicLyrics()
                        await viewModel.fetchTrendingTags()
                        if let userId = auth.userId {
                            await followManager.fetchFollows(userId: userId)
                        }
                    }
                    .onChange(of: scrollToTop) { _, _ in
                        if !navigationPath.isEmpty {
                            navigationPath = NavigationPath()
                        } else {
                            withAnimation { proxy.scrollTo("explore-top", anchor: .top) }
                        }
                    }
                    } // ScrollViewReader
                }
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
            .navigationDestination(for: ProfileDestination.self) { dest in
                PublicProfileView(userId: dest.userId, username: dest.username)
            }
            .earwyrmBranding()
            .toolbar {
                if !auth.isAuthenticated {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            authGate.showAuthSheet = true
                        } label: {
                            Text("Sign In")
                                .font(Theme.dmSans(14, weight: .medium))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                }
            }
        }
        .sheet(item: $shareLyric) { lyric in
            ShareModalView(
                lyric: lyric,
                note: nil,
                username: shareUsername,
                onShareCompleted: {
                    Task {
                        guard let actorId = auth.userId,
                              let actorUsername = auth.profile?.username,
                              let ownerId = shareOwnerId else { return }
                        await notificationManager.sendShareNotification(
                            lyricOwnerId: ownerId,
                            actorId: actorId,
                            actorUsername: actorUsername,
                            lyric: lyric
                        )
                    }
                }
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .task {
            await viewModel.fetchPublicLyrics()
            await viewModel.fetchTrendingTags()
            if let userId = auth.userId {
                await followManager.fetchFollows(userId: userId)
            }
        }
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
        HStack(spacing: Theme.Spacing.lg) {
            tabButton("for you", tag: 0)
            if auth.isAuthenticated {
                tabButton("following", tag: 1)
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
                .font(Theme.dmSans(14))
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
}
