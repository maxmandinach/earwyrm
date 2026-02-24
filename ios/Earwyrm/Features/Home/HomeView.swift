import SwiftUI
import UIKit

struct HomeView: View {
    @Binding var navigationPath: NavigationPath
    var scrollToTop: Bool = false
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager
    @Environment(NotificationManager.self) private var notificationManager
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(BlockManager.self) private var blockManager
    @State private var viewModel = HomeViewModel()
    @State private var showPostSheet = false
    @State private var showEditSheet = false
    @State private var showShareModal = false
    @State private var showComments = false
    @State private var resonateVM: ResonateViewModel?
    @State private var shareCarouselLyric: Lyric?
    @State private var shareCarouselUsername: String?
    @State private var shareCarouselOwnerId: UUID?
    @State private var bookmarkLyricId: UUID?
    @State private var showCollectionPicker = false
    @State private var reportLyric: Lyric?
    @State private var blockTarget: (userId: UUID, username: String)?
    @State private var showBlockAlert = false

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: Theme.Spacing.lg) {
                        Color.clear.frame(height: 0).id("home-top")
                        if viewModel.isLoading {
                            Spacer()
                                .frame(height: 100)
                            ProgressView()
                                .tint(Theme.accent)
                        } else if let error = viewModel.error {
                            // Error state
                            VStack(spacing: Theme.Spacing.sm) {
                                Spacer()
                                    .frame(height: 80)
                                Text("couldn't load your lyric")
                                    .font(Theme.caveat(28))
                                    .foregroundStyle(Theme.textPrimary)
                                Text(error)
                                    .font(Theme.dmSans(13))
                                    .foregroundStyle(Theme.textMuted)
                                    .multilineTextAlignment(.center)
                                Button("Retry") {
                                    Task {
                                        if let userId = auth.userId {
                                            await viewModel.fetchCurrentLyric(userId: userId)
                                        }
                                    }
                                }
                                .font(Theme.dmSans(14, weight: .medium))
                                .foregroundStyle(Theme.accent)
                                .padding(.top, Theme.Spacing.sm)
                            }
                            .padding(.horizontal, Theme.Spacing.lg)
                        } else if let lyric = viewModel.currentLyric {
                            // Hero card with actions
                            LyricCardView(
                                lyric: lyric,
                                hero: true,
                                showActions: true,
                                isPublic: lyric.isPublic ?? false,
                                isOwn: lyric.userId == auth.userId,
                                onShare: { showShareModal = true },
                                onReplace: { showPostSheet = true },
                                onEdit: { showEditSheet = true },
                                onVisibilityChange: { newValue in
                                    Task { await viewModel.toggleVisibility(lyricId: lyric.id, isPublic: newValue) }
                                },
                                hasReacted: resonateVM?.hasReacted ?? false,
                                reactionCount: resonateVM?.count ?? (lyric.reactionCount ?? 0),
                                isResonateAnimating: resonateVM?.isAnimating ?? false,
                                onResonate: { resonateVM?.toggle() },
                                commentCount: lyric.commentCount ?? 0,
                                showComments: showComments,
                                onToggleComments: { showComments.toggle() },
                                onSave: {
                                    bookmarkLyricId = lyric.id
                                    showCollectionPicker = true
                                },
                                isSaved: collectionManager.isLyricSaved(lyric.id),
                                note: viewModel.currentNote,
                                currentUserId: auth.userId
                            )
                            .padding(.horizontal, Theme.Spacing.md)
                            .padding(.top, Theme.Spacing.md)
                            .cascadeReveal(delay: 0.2)

                            // Collections carousel
                            CollectionsCarouselSection(collections: collectionManager.collections)
                                .cascadeReveal(delay: 0.3)

                            // Memory Lane
                            MemoryLaneSection(
                                lyrics: viewModel.pastLyrics,
                                showUpsell: !subscriptionManager.isPlus
                            )
                            .cascadeReveal(delay: 0.4)

                            // Trending
                            TrendingSection(
                                lyrics: viewModel.trendingLyrics.filter { !blockManager.isBlocked($0.lyric.userId) },
                                onShare: { item in
                                    shareCarouselLyric = item.lyric
                                    shareCarouselUsername = item.username
                                    shareCarouselOwnerId = item.lyric.userId
                                },
                                onSave: { item in
                                    bookmarkLyricId = item.lyric.id
                                    showCollectionPicker = true
                                },
                                onViewProfile: { item in
                                    navigationPath.append(ProfileDestination(userId: item.lyric.userId, username: item.username ?? ""))
                                },
                                onReport: { item in
                                    reportLyric = item.lyric
                                },
                                onBlock: { item in
                                    blockTarget = (userId: item.lyric.userId, username: item.username ?? "user")
                                    showBlockAlert = true
                                },
                                isLyricSaved: { id in collectionManager.isLyricSaved(id) }
                            )
                            .cascadeReveal(delay: 0.6)

                            // From Your Follows
                            FollowFeedSection(
                                lyrics: viewModel.followFeedLyrics.filter { !blockManager.isBlocked($0.lyric.userId) },
                                onShare: { item in
                                    shareCarouselLyric = item.lyric
                                    shareCarouselUsername = item.username
                                    shareCarouselOwnerId = item.lyric.userId
                                },
                                onSave: { item in
                                    bookmarkLyricId = item.lyric.id
                                    showCollectionPicker = true
                                },
                                onViewProfile: { item in
                                    navigationPath.append(ProfileDestination(userId: item.lyric.userId, username: item.username ?? ""))
                                },
                                onReport: { item in
                                    reportLyric = item.lyric
                                },
                                onBlock: { item in
                                    blockTarget = (userId: item.lyric.userId, username: item.username ?? "user")
                                    showBlockAlert = true
                                },
                                isLyricSaved: { id in collectionManager.isLyricSaved(id) }
                            )
                            .cascadeReveal(delay: 0.8)

                            // Bottom padding for FAB
                            Spacer()
                                .frame(height: 80)
                        } else {
                            // Empty state — CTA + trending content
                            emptyState

                            // Show trending even without a current lyric
                            TrendingSection(
                                lyrics: viewModel.trendingLyrics.filter { !blockManager.isBlocked($0.lyric.userId) },
                                onShare: { item in
                                    shareCarouselLyric = item.lyric
                                    shareCarouselUsername = item.username
                                    shareCarouselOwnerId = item.lyric.userId
                                },
                                onSave: { item in
                                    bookmarkLyricId = item.lyric.id
                                    showCollectionPicker = true
                                },
                                onViewProfile: { item in
                                    navigationPath.append(ProfileDestination(userId: item.lyric.userId, username: item.username ?? ""))
                                },
                                onReport: { item in
                                    reportLyric = item.lyric
                                },
                                onBlock: { item in
                                    blockTarget = (userId: item.lyric.userId, username: item.username ?? "user")
                                    showBlockAlert = true
                                },
                                isLyricSaved: { id in collectionManager.isLyricSaved(id) }
                            )
                            .cascadeReveal(delay: 0.4)

                            Spacer().frame(height: 80)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .refreshable {
                    if let userId = auth.userId {
                        await viewModel.refreshCurrentLyric(userId: userId)
                        await collectionManager.fetchCollections(userId: userId)
                    }
                }
                .background(Theme.background)
                .onChange(of: scrollToTop) { _, _ in
                    withAnimation { proxy.scrollTo("home-top", anchor: .top) }
                }
            } // ScrollViewReader
            .navigationDestination(for: LyricWithProfile.self) { item in
                LyricDetailDestination(item: item)
            }
            .navigationDestination(for: Collection.self) { collection in
                CollectionDetailView(collection: collection)
            }
            .navigationDestination(for: DeepLinkDestination.self) { destination in
                switch destination {
                case .sharedLyric(let token):
                    SharedLyricDetailView(shareToken: token)
                case .profile(let username):
                    ProfileUsernameResolver(username: username)
                }
            }
            .navigationDestination(for: ProfileDestination.self) { dest in
                PublicProfileView(userId: dest.userId, username: dest.username)
            }
            .earwyrmBranding()
        }
        .task {
            if let userId = auth.userId {
                await viewModel.fetchCurrentLyric(userId: userId)
                // If no current lyric, still load trending so the screen isn't empty
                if viewModel.currentLyric == nil {
                    await viewModel.fetchTrendingLyrics()
                }
            }
        }
        .onChange(of: viewModel.currentLyric?.id) { _, newId in
            // Create/recreate resonate VM when lyric changes
            if let lyric = viewModel.currentLyric, let userId = auth.userId {
                showComments = false
                resonateVM = ResonateViewModel(
                    lyricId: lyric.id,
                    userId: userId,
                    initialCount: lyric.reactionCount ?? 0
                )
                Task {
                    await resonateVM?.checkInitialState()
                    await viewModel.fetchNote(lyricId: lyric.id, userId: userId)
                    await viewModel.loadAllSections(
                        userId: userId,
                        follows: followManager.follows,
                        memoryCutoff: subscriptionManager.memoryLaneCutoffDate
                    )
                }
            } else {
                resonateVM = nil
            }
        }
        .fullScreenCover(isPresented: $showPostSheet) {
            PostLyricView(
                currentLyricId: viewModel.currentLyric?.id,
                onSaved: {
                    Task {
                        if let userId = auth.userId {
                            await viewModel.refreshCurrentLyric(userId: userId)
                        }
                    }
                }
            )
            .environment(auth)
        }
        .sheet(isPresented: $showEditSheet) {
            if let lyric = viewModel.currentLyric {
                EditLyricView(lyric: lyric) {
                    Task {
                        if let userId = auth.userId {
                            await viewModel.refreshCurrentLyric(userId: userId)
                            if let refreshedLyric = viewModel.currentLyric {
                                await viewModel.fetchNote(lyricId: refreshedLyric.id, userId: userId)
                            }
                        }
                    }
                }
                .interactiveDismissDisabled()
                .presentationDragIndicator(.visible)
            }
        }
        .sheet(isPresented: $showShareModal) {
            if let lyric = viewModel.currentLyric {
                ShareModalView(
                    lyric: lyric,
                    note: viewModel.currentNote,
                    username: auth.profile?.username
                )
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            }
        }
        .sheet(item: $shareCarouselLyric) { lyric in
            ShareModalView(
                lyric: lyric,
                note: nil,
                username: shareCarouselUsername,
                onShareCompleted: {
                    Task {
                        guard let actorId = auth.userId,
                              let actorUsername = auth.profile?.username,
                              let ownerId = shareCarouselOwnerId else { return }
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
        .sheet(isPresented: $showCollectionPicker) {
            if let lyricId = bookmarkLyricId {
                CollectionPickerSheet(lyricId: lyricId)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
        .sheet(item: $reportLyric) { lyric in
            ReportSheet(contentType: "lyric", contentId: lyric.id)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .alert(
            "Block @\(blockTarget?.username ?? "user")?",
            isPresented: $showBlockAlert
        ) {
            Button("Block", role: .destructive) {
                guard let target = blockTarget, let userId = auth.userId else { return }
                Task {
                    await blockManager.block(currentUserId: userId, targetUserId: target.userId)
                }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Their content will be hidden from your feeds. You can unblock from Settings.")
        }
    }

    private var emptyState: some View {
        Button {
            showPostSheet = true
        } label: {
            VStack(spacing: Theme.Spacing.md) {
                Spacer()
                    .frame(height: 80)

                Text("what's stuck in your head?")
                    .font(Theme.caveat(32))
                    .foregroundStyle(Theme.textPrimary)

                Text("Tap here to post your first lyric.")
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)

                Image(systemName: "plus.circle")
                    .font(.system(size: 28))
                    .foregroundStyle(Theme.accent)
                    .padding(.top, Theme.Spacing.xs)
            }
            .padding(.horizontal, Theme.Spacing.lg)
        }
    }

}

// MARK: - Profile Username Resolver (deep link)

private struct ProfileUsernameResolver: View {
    let username: String
    @State private var profile: Profile?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let profile {
                PublicProfileView(userId: profile.id, username: profile.username)
            } else if isLoading {
                ProgressView()
                    .tint(Theme.accent)
            } else {
                Text("User not found")
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.textMuted)
            }
        }
        .task {
            do {
                let result: Profile = try await supabase
                    .from("profiles")
                    .select()
                    .eq("username", value: username)
                    .single()
                    .execute()
                    .value
                profile = result
            } catch {
                print("Resolve username error: \(error)")
            }
            isLoading = false
        }
    }
}

// MARK: - Lyric Detail Destination

private struct LyricDetailDestination: View {
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
                    NavigationLink(value: ProfileDestination(userId: item.lyric.userId, username: username)) {
                        Text("posted by @\(username)")
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.accent)
                    }
                }
            }
            .padding(.top, Theme.Spacing.md)
        }
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: ProfileDestination.self) { dest in
            PublicProfileView(userId: dest.userId, username: dest.username)
        }
    }
}

