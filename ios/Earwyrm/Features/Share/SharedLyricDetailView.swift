import SwiftUI
import Supabase

struct SharedLyricDetailView: View {
    let shareToken: String
    @Environment(AuthManager.self) private var auth
    @State private var lyric: Lyric?
    @State private var username: String?
    @State private var isLoading = true
    @State private var error: String?

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
                        showActions: false,
                        isPublic: lyric.isPublic ?? false,
                        isOwn: false,
                        hasReacted: false,
                        reactionCount: lyric.reactionCount ?? 0,
                        isResonateAnimating: false,
                        commentCount: lyric.commentCount ?? 0,
                        showComments: false,
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
        .task {
            await fetchLyric()
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
