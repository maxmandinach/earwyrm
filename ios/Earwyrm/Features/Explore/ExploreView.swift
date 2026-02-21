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
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager
    @State private var viewModel = ExploreViewModel()
    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Light.background
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    HStack {
                        Text("explore")
                            .font(Theme.caveat(32))
                            .foregroundStyle(Theme.Light.text)
                        Spacer()
                    }
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.top, Theme.Spacing.sm)
                    .padding(.bottom, Theme.Spacing.xs)

                    // Underline tab bar
                    tabBar
                        .padding(.bottom, Theme.Spacing.sm)

                    // Content
                    ScrollView {
                        if selectedTab == 0 {
                            ExploreForYouView(viewModel: viewModel)
                        } else {
                            ExploreFollowingView(viewModel: viewModel)
                        }
                    }
                    .refreshable {
                        await viewModel.fetchPublicLyrics()
                        await viewModel.fetchTrendingTags()
                        if let userId = auth.userId {
                            await followManager.fetchFollows(userId: userId)
                        }
                    }
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
            tabButton("following", tag: 1)
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
                .font(Theme.dmSans(14))
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
}
