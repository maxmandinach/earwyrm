import SwiftUI
import UIKit

struct HomeView: View {
    @Binding var navigationPath: NavigationPath
    var scrollToTop: Bool = false
    @Environment(AuthManager.self) private var auth
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(ToastManager.self) private var toastManager
    @State private var viewModel = HomeViewModel()
    @State private var showPostSheet = false
    @State private var showComments = false
    @State private var resonateVM: ResonateViewModel?
    @State private var deletingPastLyric: Lyric?

    // Single active sheet to avoid SwiftUI multi-sheet presentation bugs
    @State private var activeSheet: HomeSheet?

    enum HomeSheet: Identifiable {
        case editCurrent
        case shareCurrent
        case sharePast(Lyric)
        case editPast(Lyric)
        case bookmark(UUID)

        var id: String {
            switch self {
            case .editCurrent: return "editCurrent"
            case .shareCurrent: return "shareCurrent"
            case .sharePast(let l): return "sharePast-\(l.id)"
            case .editPast(let l): return "editPast-\(l.id)"
            case .bookmark(let id): return "bookmark-\(id)"
            }
        }
    }

    // Past lyrics reaction state
    @State private var reactionStates: [UUID: Bool] = [:]
    @State private var reactionCounts: [UUID: Int] = [:]
    @State private var animatingReactions: Set<UUID> = []
    @State private var showCommentIds: Set<UUID> = []

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
                            lyricContent(lyric: lyric)

                            // Bottom padding for FAB
                            Spacer()
                                .frame(height: 80)
                        } else {
                            // Empty state — CTA + collections
                            emptyState

                            CollectionsCarouselSection(collections: collectionManager.collections)
                                .cascadeReveal(delay: 0.35)

                            Spacer().frame(height: 80)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .refreshable {
                    if let userId = auth.userId {
                        await viewModel.refreshCurrentLyric(userId: userId)
                        await viewModel.fetchPastLyrics(userId: userId)
                        await collectionManager.fetchCollections(userId: userId)
                        await fetchReactionStates()
                    }
                }
                .background(Theme.background)
                .onChange(of: scrollToTop) { _, _ in
                    if !navigationPath.isEmpty {
                        navigationPath = NavigationPath()
                    } else {
                        withAnimation { proxy.scrollTo("home-top", anchor: .top) }
                    }
                }
            } // ScrollViewReader
            .overlay(alignment: .bottomTrailing) {
                if viewModel.currentLyric != nil {
                    Button {
                        showPostSheet = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 52, height: 52)
                            .background(Theme.accent)
                            .clipShape(Circle())
                            .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
                    }
                    .padding(.trailing, Theme.Spacing.lg)
                    .padding(.bottom, 72)
                }
            }
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
                case .artist(let name):
                    ArtistPageView(artistName: name)
                case .song(let title, let artistName):
                    SongPageView(songTitle: title, artistName: artistName, coverArtUrl: nil)
                }
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
            .earwyrmBranding()
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
                    initialCount: lyric.reactionCount ?? 0,
                    toast: toastManager
                )
                Task {
                    // Run in parallel to minimize re-render window
                    async let a: Void = resonateVM?.checkInitialState() ?? ()
                    async let b: Void = viewModel.fetchNote(lyricId: lyric.id, userId: userId)
                    async let c: Void = viewModel.loadAllSections(userId: userId)
                    _ = await (a, b, c)
                    // Fetch reaction states after past lyrics are loaded
                    await fetchReactionStates()
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
        .sheet(item: $activeSheet) { sheet in
            switch sheet {
            case .editCurrent:
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
            case .shareCurrent:
                if let lyric = viewModel.currentLyric {
                    ShareModalView(
                        lyric: lyric,
                        note: viewModel.currentNote,
                        username: auth.profile?.username,
                        onNoteSaved: { content in
                            Task {
                                if let userId = auth.userId {
                                    await viewModel.fetchNote(lyricId: lyric.id, userId: userId)
                                }
                            }
                        },
                        onArtGenerated: {
                            Task {
                                if let userId = auth.userId {
                                    await viewModel.refreshCurrentLyric(userId: userId)
                                }
                            }
                        }
                    )
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
                    .presentationBackground(Theme.background)
                }
            case .sharePast(let lyric):
                ShareModalView(
                    lyric: lyric,
                    note: nil,
                    username: auth.profile?.username
                )
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                .presentationBackground(Theme.background)
            case .editPast(let lyric):
                EditLyricView(
                    lyric: lyric,
                    onSaved: {
                        Task {
                            if let userId = auth.userId {
                                await viewModel.fetchPastLyrics(userId: userId)
                            }
                        }
                    },
                    isPastLyric: true
                )
                .interactiveDismissDisabled()
                .presentationDragIndicator(.visible)
            case .bookmark(let lyricId):
                CollectionPickerSheet(lyricId: lyricId)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
        .alert("Delete lyric?", isPresented: Binding(
            get: { deletingPastLyric != nil },
            set: { if !$0 { deletingPastLyric = nil } }
        )) {
            Button("Cancel", role: .cancel) { deletingPastLyric = nil }
            Button("Delete", role: .destructive) {
                if let lyric = deletingPastLyric {
                    Task {
                        do {
                            try await viewModel.deleteLyric(lyricId: lyric.id)
                            Haptics.medium()
                        } catch {
                            toastManager.show("couldn't delete lyric")
                        }
                    }
                }
            }
        } message: {
            Text("This can't be undone.")
        }
    }

    @ViewBuilder
    private func lyricContent(lyric: Lyric) -> some View {
        // Hero card with actions
        LyricCardView(
            lyric: lyric,
            hero: true,
            showActions: true,
            isPublic: lyric.isPublic ?? false,
            isOwn: lyric.userId == auth.userId,
            onShare: { activeSheet = .shareCurrent },
            onEdit: { activeSheet = .editCurrent },
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
                activeSheet = .bookmark(lyric.id)
            },
            isSaved: collectionManager.isLyricSaved(lyric.id),
            note: viewModel.currentNote,
            currentUserId: auth.userId
        )
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.top, Theme.Spacing.md)

        // Past earwyrms — separate view to isolate re-renders from hero card
        PastEarwyrmsSection(
            viewModel: viewModel,
            reactionStates: $reactionStates,
            reactionCounts: $reactionCounts,
            animatingReactions: $animatingReactions,
            showCommentIds: $showCommentIds,
            activeSheet: $activeSheet,
            navigationPath: $navigationPath,
            deletingPastLyric: $deletingPastLyric
        )

        // Collections carousel
        CollectionsCarouselSection(collections: collectionManager.collections)
            .cascadeReveal(delay: 0.35)
    }

    // MARK: - Past Lyrics Reactions

    private func fetchReactionStates() async {
        guard let userId = auth.userId else { return }
        let lyricIds = viewModel.pastLyrics.map { $0.id.uuidString }
        guard !lyricIds.isEmpty else { return }

        // Initialize counts from lyric data
        for lyric in viewModel.pastLyrics {
            if reactionCounts[lyric.id] == nil {
                reactionCounts[lyric.id] = lyric.reactionCount ?? 0
            }
        }

        do {
            let reactions: [Reaction] = try await supabase
                .from("reactions")
                .select("id, lyric_id, user_id, created_at")
                .eq("user_id", value: userId.uuidString)
                .in("lyric_id", values: lyricIds)
                .execute()
                .value
            for reaction in reactions {
                reactionStates[reaction.lyricId] = true
            }
        } catch {
            print("Fetch past lyrics reaction states error: \(error)")
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

// MARK: - Past Earwyrms Section (isolated to prevent hero card re-renders)

private struct PastEarwyrmsSection: View {
    let viewModel: HomeViewModel
    @Binding var reactionStates: [UUID: Bool]
    @Binding var reactionCounts: [UUID: Int]
    @Binding var animatingReactions: Set<UUID>
    @Binding var showCommentIds: Set<UUID>
    @Binding var activeSheet: HomeView.HomeSheet?
    @Binding var navigationPath: NavigationPath
    @Binding var deletingPastLyric: Lyric?

    @Environment(AuthManager.self) private var auth
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(ToastManager.self) private var toastManager

    var body: some View {
        if !viewModel.pastLyrics.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                CaveatText(text: "past earwyrms", size: 24, color: Theme.textSecondary)
                    .padding(.horizontal, Theme.Spacing.lg)

                LazyVStack(spacing: Theme.Spacing.sm) {
                    ForEach(viewModel.pastLyrics) { pastLyric in
                        ProfileLyricRow(
                            lyric: pastLyric,
                            hasReacted: reactionStates[pastLyric.id] ?? false,
                            reactionCount: reactionCounts[pastLyric.id] ?? pastLyric.reactionCount ?? 0,
                            isResonateAnimating: animatingReactions.contains(pastLyric.id),
                            onResonate: { toggleReaction(for: pastLyric) },
                            commentCount: pastLyric.commentCount ?? 0,
                            showComments: showCommentIds.contains(pastLyric.id),
                            onToggleComments: { toggleCommentVisibility(pastLyric.id) },
                            isPublic: pastLyric.isPublic ?? false,
                            onVisibilityChange: { newValue in
                                Task { await viewModel.toggleVisibility(lyricId: pastLyric.id, isPublic: newValue) }
                            },
                            onSave: { activeSheet = .bookmark(pastLyric.id) },
                            isSaved: collectionManager.isLyricSaved(pastLyric.id),
                            onShare: { activeSheet = .sharePast(pastLyric) },
                            isOwn: pastLyric.userId == auth.userId,
                            currentUserId: auth.userId,
                            onNavigate: {
                                navigationPath.append(LyricWithProfile(lyric: pastLyric, username: nil))
                            },
                            onEdit: pastLyric.userId == auth.userId ? { activeSheet = .editPast(pastLyric) } : nil,
                            onMakeCurrent: pastLyric.userId == auth.userId ? {
                                Task { await makeCurrentFromHome(pastLyric) }
                            } : nil,
                            onDelete: pastLyric.userId == auth.userId ? { deletingPastLyric = pastLyric } : nil
                        )
                    }
                }
                .padding(.horizontal, Theme.Spacing.md)
            }
            .cascadeReveal(delay: 0.3)
        }
    }

    private func toggleReaction(for lyric: Lyric) {
        guard let userId = auth.userId else { return }

        let wasReacted = reactionStates[lyric.id] ?? false
        let currentCount = reactionCounts[lyric.id] ?? lyric.reactionCount ?? 0

        reactionStates[lyric.id] = !wasReacted
        reactionCounts[lyric.id] = currentCount + (wasReacted ? -1 : 1)

        if !wasReacted {
            animatingReactions.insert(lyric.id)
            Haptics.medium()
            Task {
                try? await Task.sleep(nanoseconds: 600_000_000)
                animatingReactions.remove(lyric.id)
            }
        } else {
            Haptics.light()
        }

        Task {
            do {
                if wasReacted {
                    try await supabase
                        .from("reactions")
                        .delete()
                        .eq("lyric_id", value: lyric.id.uuidString)
                        .eq("user_id", value: userId.uuidString)
                        .execute()
                } else {
                    let insert = ReactionInsert(lyricId: lyric.id, userId: userId)
                    try await supabase
                        .from("reactions")
                        .insert(insert)
                        .execute()
                }
            } catch {
                reactionStates[lyric.id] = wasReacted
                reactionCounts[lyric.id] = currentCount
                toastManager.show("couldn't resonate, try again")
            }
        }
    }

    private func toggleCommentVisibility(_ lyricId: UUID) {
        if showCommentIds.contains(lyricId) {
            showCommentIds.remove(lyricId)
        } else {
            showCommentIds.insert(lyricId)
        }
    }

    private func makeCurrentFromHome(_ lyric: Lyric) async {
        guard let userId = auth.userId else { return }
        do {
            try await supabase
                .from("lyrics")
                .update(LyricArchiveUpdate(
                    isCurrent: false,
                    replacedAt: ISO8601DateFormatter().string(from: Date())
                ))
                .eq("user_id", value: userId.uuidString)
                .eq("is_current", value: true)
                .execute()

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
            await viewModel.refreshCurrentLyric(userId: userId)
            await viewModel.fetchPastLyrics(userId: userId)
        } catch {
            toastManager.show("couldn't make current, try again")
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
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(NotificationManager.self) private var notificationManager
    @Environment(ToastManager.self) private var toastManager
    @Environment(\.dismiss) private var dismiss
    @State private var resonateVM: ResonateViewModel?
    @State private var showComments = false
    @State private var activeSheet: DetailSheet?
    @State private var showDeleteConfirm = false

    private enum DetailSheet: Identifiable {
        case share
        case bookmark(UUID)
        case edit

        var id: String {
            switch self {
            case .share: return "share"
            case .bookmark(let uuid): return "bookmark-\(uuid)"
            case .edit: return "edit"
            }
        }
    }

    private var lyric: Lyric { item.lyric }
    private var isOwn: Bool { lyric.userId == auth.userId }

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.Spacing.lg) {
                LyricCardView(
                    lyric: lyric,
                    hero: true,
                    showActions: true,
                    isPublic: lyric.isPublic ?? false,
                    isOwn: isOwn,
                    onShare: { activeSheet = .share },
                    onEdit: isOwn ? { activeSheet = .edit } : nil,
                    hasReacted: resonateVM?.hasReacted ?? false,
                    reactionCount: resonateVM?.count ?? (lyric.reactionCount ?? 0),
                    isResonateAnimating: resonateVM?.isAnimating ?? false,
                    onResonate: { resonateVM?.toggle() },
                    commentCount: lyric.commentCount ?? 0,
                    showComments: showComments,
                    onToggleComments: { showComments.toggle() },
                    onSave: {
                        activeSheet = .bookmark(lyric.id)
                    },
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

                // Delete button for own lyrics
                if isOwn {
                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "trash")
                                .font(.system(size: 13))
                            Text("delete lyric")
                                .font(Theme.dmSans(14, weight: .medium))
                        }
                        .foregroundStyle(.red.opacity(0.8))
                    }
                }
            }
            .padding(.top, Theme.Spacing.md)
        }
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard let userId = auth.userId else { return }
            let vm = ResonateViewModel(
                lyricId: lyric.id,
                userId: userId,
                initialCount: lyric.reactionCount ?? 0,
                toast: toastManager
            )
            resonateVM = vm
            // Non-blocking: view renders immediately, reaction state fills in
            Task { await vm.checkInitialState() }
        }
        .sheet(item: $activeSheet) { sheet in
            switch sheet {
            case .share:
                ShareModalView(
                    lyric: lyric,
                    note: nil,
                    username: item.username,
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
                .presentationBackground(Theme.background)
            case .bookmark(let lyricId):
                CollectionPickerSheet(lyricId: lyricId)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            case .edit:
                EditLyricView(
                    lyric: lyric,
                    onSaved: {},
                    isPastLyric: lyric.isCurrent != true
                )
                .interactiveDismissDisabled()
                .presentationDragIndicator(.visible)
            }
        }
        .alert("Delete lyric?", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task {
                    do {
                        try await supabase
                            .from("lyrics")
                            .delete()
                            .eq("id", value: lyric.id.uuidString)
                            .execute()
                        Haptics.medium()
                        dismiss()
                    } catch {
                        toastManager.show("couldn't delete lyric")
                    }
                }
            }
        } message: {
            Text("This can't be undone.")
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
}

// MARK: - Identifiable UUID wrapper for sheet(item:)

struct IdentifiableUUID: Identifiable {
    let id: UUID
    let value: UUID
    init(_ value: UUID) {
        self.id = value
        self.value = value
    }
}
