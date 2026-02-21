import SwiftUI
import UIKit

struct HomeView: View {
    @Environment(AuthManager.self) private var auth
    @State private var viewModel = HomeViewModel()
    @State private var showPostSheet = false
    @State private var showEditSheet = false
    @State private var showShareSheet = false
    @State private var showComments = false
    @State private var resonateVM: ResonateViewModel?

    private var shareURL: URL? {
        guard let token = viewModel.currentLyric?.shareToken else { return nil }
        return URL(string: "https://earwyrm.app/s/\(token)")
    }

    var body: some View {
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
                            currentUserId: auth.userId
                        )
                        .padding(.horizontal, Theme.Spacing.md)
                        .padding(.top, Theme.Spacing.md)
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
                Task { await resonateVM?.checkInitialState() }
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

// MARK: - Native Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
