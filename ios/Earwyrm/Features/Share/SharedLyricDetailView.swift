import SwiftUI
import Supabase

struct SharedLyricDetailView: View {
    let shareToken: String
    @Environment(AuthManager.self) private var auth
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(NotificationManager.self) private var notificationManager
    @Environment(ToastManager.self) private var toastManager
    @State private var lyric: Lyric?
    @State private var username: String?
    @State private var isLoading = true
    @State private var error: String?
    @State private var resonateVM: ResonateViewModel?
    @State private var showComments = false
    @State private var showShareModal = false
    @State private var bookmarkLyricId: IdentifiableUUID?

    var body: some View {
        ScrollView {
            if isLoading {
                VStack {
                    Spacer().frame(height: 100)
                    ProgressView()
                        .tint(Theme.accent)
                }
            } else if let error {
                VStack(spacing: Theme.Spacing.sm) {
                    Spacer().frame(height: 80)
                    Text("lyric not found")
                        .font(Theme.caveat(28))
                        .foregroundStyle(Theme.textPrimary)
                    Text(error)
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textMuted)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, Theme.Spacing.lg)
            } else if let lyric {
                VStack(spacing: Theme.Spacing.lg) {
                    LyricCardView(
                        lyric: lyric,
                        hero: true,
                        showActions: true,
                        isPublic: lyric.isPublic ?? false,
                        isOwn: false,
                        onShare: { showShareModal = true },
                        hasReacted: resonateVM?.hasReacted ?? false,
                        reactionCount: resonateVM?.count ?? (lyric.reactionCount ?? 0),
                        isResonateAnimating: resonateVM?.isAnimating ?? false,
                        onResonate: { resonateVM?.toggle() },
                        commentCount: lyric.commentCount ?? 0,
                        showComments: showComments,
                        onToggleComments: { showComments.toggle() },
                        onSave: {
                            bookmarkLyricId = IdentifiableUUID(lyric.id)
                        },
                        isSaved: collectionManager.isLyricSaved(lyric.id),
                        currentUserId: auth.userId
                    )
                    .padding(.horizontal, Theme.Spacing.md)

                    if let username {
                        NavigationLink(value: ProfileDestination(userId: lyric.userId, username: username)) {
                            Text("posted by @\(username)")
                                .font(Theme.dmSans(14))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                }
                .padding(.top, Theme.Spacing.md)
            }
        }
        .frame(maxWidth: .infinity)
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: ProfileDestination.self) { dest in
            PublicProfileView(userId: dest.userId, username: dest.username)
        }
        .navigationDestination(for: ArtistDestination.self) { dest in
            ArtistPageView(artistName: dest.name)
        }
        .navigationDestination(for: SongDestination.self) { dest in
            SongPageView(songTitle: dest.title, artistName: dest.artistName, coverArtUrl: dest.coverArtUrl)
        }
        .task {
            await fetchLyric()
        }
        .onChange(of: lyric?.id) { _, newId in
            guard let lyric, let userId = auth.userId else {
                resonateVM = nil
                return
            }
            resonateVM = ResonateViewModel(
                lyricId: lyric.id,
                userId: userId,
                initialCount: lyric.reactionCount ?? 0,
                toast: toastManager
            )
            Task {
                await resonateVM?.checkInitialState()
            }
        }
        .sheet(isPresented: $showShareModal) {
            if let lyric {
                ShareModalView(
                    lyric: lyric,
                    note: nil,
                    username: username,
                    onShareCompleted: {
                        Task {
                            guard let actorId = auth.userId,
                                  let actorUsername = auth.profile?.username else { return }
                            await notificationManager.sendShareNotification(
                                lyricOwnerId: lyric.userId,
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
        }
        .sheet(item: $bookmarkLyricId) { item in
            CollectionPickerSheet(lyricId: item.value)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
    }

    private func fetchLyric() async {
        do {
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select(HomeViewModel.lyricColumns)
                .eq("share_token", value: shareToken)
                .limit(1)
                .execute()
                .value

            guard let found = lyrics.first else {
                await MainActor.run {
                    self.error = "This lyric may have been removed or the link is invalid."
                    self.isLoading = false
                }
                return
            }

            // Fetch profile for attribution
            let profiles: [CommentProfile] = try await supabase
                .from("profiles")
                .select("id, username")
                .eq("id", value: found.userId.uuidString)
                .limit(1)
                .execute()
                .value

            await MainActor.run {
                self.lyric = found
                self.username = profiles.first?.username
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }
}
