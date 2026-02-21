import SwiftUI
import UIKit

struct HomeView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager
    @State private var viewModel = HomeViewModel()
    @State private var showPostSheet = false
    @State private var showEditSheet = false
    @State private var showShareSheet = false
    @State private var showComments = false
    @State private var showNoteEditor = false
    @State private var resonateVM: ResonateViewModel?

    private var shareURL: URL? {
        guard let token = viewModel.currentLyric?.shareToken else { return nil }
        return URL(string: "https://earwyrm.app/s/\(token)")
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottomTrailing) {
                ScrollView {
                    VStack(spacing: Theme.Spacing.lg) {
                        if viewModel.isLoading {
                            Spacer()
                                .frame(height: 100)
                            ProgressView()
                                .tint(Theme.Light.accent)
                        } else if let error = viewModel.error {
                            // Error state
                            VStack(spacing: Theme.Spacing.sm) {
                                Spacer()
                                    .frame(height: 80)
                                Text("couldn't load your lyric")
                                    .font(Theme.caveat(28))
                                    .foregroundStyle(Theme.Light.text)
                                Text(error)
                                    .font(Theme.dmSans(13))
                                    .foregroundStyle(Theme.Light.muted)
                                    .multilineTextAlignment(.center)
                                Button("Retry") {
                                    Task {
                                        if let userId = auth.userId {
                                            await viewModel.fetchCurrentLyric(userId: userId)
                                        }
                                    }
                                }
                                .font(Theme.dmSans(14, weight: .medium))
                                .foregroundStyle(Theme.Light.accent)
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
                                onShare: { showShareSheet = true },
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
                                currentUserId: auth.userId,
                                note: viewModel.currentNote,
                                onTapNote: { showNoteEditor = true }
                            )
                            .padding(.horizontal, Theme.Spacing.md)
                            .padding(.top, Theme.Spacing.md)
                            .cascadeReveal(delay: 0.2)

                            // Memory Lane
                            MemoryLaneSection(lyrics: viewModel.pastLyrics)
                                .cascadeReveal(delay: 0.4)

                            // Trending
                            TrendingSection(lyrics: viewModel.trendingLyrics)
                                .cascadeReveal(delay: 0.6)

                            // From Your Follows
                            FollowFeedSection(lyrics: viewModel.followFeedLyrics)
                                .cascadeReveal(delay: 0.8)

                            // Bottom padding for FAB
                            Spacer()
                                .frame(height: 80)
                        } else {
                            // Empty state — tappable CTA
                            emptyState
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .background(Theme.Light.background)

                // FAB — only show when there's content or empty state (not loading/error)
                if !viewModel.isLoading && viewModel.error == nil {
                    fabButton
                }
            }
            .navigationDestination(for: LyricWithProfile.self) { item in
                LyricDetailDestination(item: item)
            }
        }
        .task {
            if let userId = auth.userId {
                await viewModel.fetchCurrentLyric(userId: userId)
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
                    await viewModel.loadAllSections(
                        userId: userId,
                        follows: followManager.follows
                    )
                    await viewModel.fetchNote(lyricId: lyric.id, userId: userId)
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
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = shareURL {
                ShareSheet(items: [url])
                    .presentationDetents([.medium])
            }
        }
        .sheet(isPresented: $showNoteEditor) {
            if let lyric = viewModel.currentLyric, let userId = auth.userId {
                NoteEditorSheet(
                    lyricId: lyric.id,
                    userId: userId,
                    viewModel: viewModel
                )
                .presentationDetents([.medium])
            }
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
                    .foregroundStyle(Theme.Light.text)

                Text("Tap here to post your first lyric.")
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.Light.secondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)

                Image(systemName: "plus.circle")
                    .font(.system(size: 28))
                    .foregroundStyle(Theme.Light.accent)
                    .padding(.top, Theme.Spacing.xs)
            }
            .padding(.horizontal, Theme.Spacing.lg)
        }
    }

    private var fabButton: some View {
        Button {
            Haptics.medium()
            showPostSheet = true
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(Theme.Light.accent)
                .clipShape(Circle())
                .shadow(color: Theme.Light.accent.opacity(0.4), radius: 8, y: 4)
        }
        .padding(.trailing, Theme.Spacing.lg)
        .padding(.bottom, Theme.Spacing.lg)
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

// MARK: - Native Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
