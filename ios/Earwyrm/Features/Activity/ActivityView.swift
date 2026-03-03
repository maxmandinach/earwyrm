import SwiftUI
import Supabase

struct ActivityView: View {
    var scrollToTop: Bool = false
    @Environment(AuthManager.self) private var auth
    @Environment(NotificationManager.self) private var notificationManager
    @State private var selectedFilter = 0
    @State private var navigationPath = NavigationPath()
    @State private var actorPlusMap: [UUID: Bool] = [:]

    private let filters = ["All", "Resonances", "Comments", "Follows"]

    private var filteredNotifications: [AppNotification] {
        switch selectedFilter {
        case 1: return notificationManager.notifications.filter { $0.type == "reaction" }
        case 2: return notificationManager.notifications.filter { $0.type == "comment" || $0.type == "reply" }
        case 3: return notificationManager.notifications.filter { $0.type == "follow" }
        default: return notificationManager.notifications
        }
    }

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ZStack {
                Theme.background
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Filter pills
                    filterBar
                        .padding(.top, Theme.Spacing.xs)
                        .padding(.bottom, Theme.Spacing.sm)

                    // Notification list
                    ScrollViewReader { proxy in
                    ScrollView {
                        Color.clear.frame(height: 0).id("activity-top")
                        if notificationManager.isLoading && notificationManager.notifications.isEmpty {
                            ProgressView()
                                .tint(Theme.accent)
                                .padding(.top, Theme.Spacing.xxl)
                        } else if filteredNotifications.isEmpty {
                            emptyState
                                .padding(.top, Theme.Spacing.xxl)
                        } else {
                            LazyVStack(spacing: 0) {
                                ForEach(filteredNotifications) { notification in
                                    NavigationLink(value: notificationDestination(notification)) {
                                        NotificationRow(
                                            notification: notification,
                                            isActorPlus: notification.actorId.flatMap { actorPlusMap[$0] } ?? false
                                        )
                                    }
                                    .buttonStyle(.plain)

                                    Divider()
                                        .foregroundStyle(Theme.dividerColor)
                                        .padding(.horizontal, Theme.Spacing.md)
                                }

                                // Load more
                                if notificationManager.hasMore {
                                    Button {
                                        Task {
                                            if let userId = auth.userId {
                                                await notificationManager.fetchNotifications(
                                                    userId: userId,
                                                    offset: notificationManager.notifications.count
                                                )
                                            }
                                        }
                                    } label: {
                                        Text("Load more")
                                            .font(Theme.dmSans(14, weight: .medium))
                                            .foregroundStyle(Theme.accent)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, Theme.Spacing.md)
                                    }
                                    .frame(minHeight: 44)
                                }
                            }
                        }

                        Spacer().frame(height: Theme.Spacing.xl)
                    }
                    .refreshable {
                        if let userId = auth.userId {
                            await notificationManager.fetchNotifications(userId: userId)
                            await fetchActorPlusStatus()
                        }
                    }
                    .onChange(of: scrollToTop) { _, _ in
                        if !navigationPath.isEmpty {
                            navigationPath = NavigationPath()
                        } else {
                            withAnimation { proxy.scrollTo("activity-top", anchor: .top) }
                        }
                    }
                    } // ScrollViewReader
                }
            }
            .navigationDestination(for: ActivityDestination.self) { dest in
                switch dest {
                case .lyric(let token):
                    SharedLyricDetailView(shareToken: token)
                case .profile(let userId, let username):
                    PublicProfileView(userId: userId, username: username)
                }
            }
            .earwyrmBranding()
        }
        .task {
            if let userId = auth.userId {
                await notificationManager.fetchNotifications(userId: userId)
                await fetchActorPlusStatus()
            }
        }
        .onChange(of: notificationManager.notifications.count) { _, _ in
            Task { await fetchActorPlusStatus() }
        }
    }

    // MARK: - Actor Plus Status

    private func fetchActorPlusStatus() async {
        let actorIds = Array(Set(notificationManager.notifications.compactMap(\.actorId)))
        let newIds = actorIds.filter { actorPlusMap[$0] == nil }
        guard !newIds.isEmpty else { return }
        do {
            let profiles: [CommentProfile] = try await supabase
                .from("profiles")
                .select("id, username, subscription_tier")
                .in("id", values: newIds.map(\.uuidString))
                .execute()
                .value
            for p in profiles {
                actorPlusMap[p.id] = p.isPlus
            }
        } catch {
            print("Fetch actor plus status error: \(error)")
        }
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.sm) {
                ForEach(Array(filters.enumerated()), id: \.offset) { index, title in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedFilter = index
                        }
                        Haptics.light()
                    } label: {
                        Text(title)
                            .font(Theme.dmSans(13, weight: selectedFilter == index ? .medium : .regular))
                            .foregroundStyle(
                                selectedFilter == index
                                    ? Theme.textPrimary
                                    : Theme.textMuted
                            )
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(
                                Capsule()
                                    .fill(selectedFilter == index ? Theme.card : Color.clear)
                            )
                            .overlay(
                                Capsule()
                                    .strokeBorder(
                                        selectedFilter == index ? Theme.dividerColor : Color.clear,
                                        lineWidth: 1
                                    )
                            )
                    }
                }
            }
            .padding(.horizontal, Theme.Spacing.md)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Text("no activity yet")
                .font(Theme.caveat(24))
                .foregroundStyle(Theme.textSecondary)
            Text("Reactions, comments, and follows will appear here.")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }

    // MARK: - Navigation

    private func notificationDestination(_ notification: AppNotification) -> ActivityDestination {
        if notification.type == "follow", let actorId = notification.actorId {
            return .profile(userId: actorId, username: notification.actorUsername ?? "")
        }
        if let token = notification.shareToken {
            return .lyric(shareToken: token)
        }
        return .lyric(shareToken: "")
    }
}

// MARK: - Activity Destination

enum ActivityDestination: Hashable {
    case lyric(shareToken: String)
    case profile(userId: UUID, username: String)
}

// MARK: - Notification Row

private struct NotificationRow: View {
    let notification: AppNotification
    var isActorPlus: Bool = false

    var body: some View {
        HStack(alignment: .top, spacing: Theme.Spacing.sm) {
            // Icon
            notificationIcon
                .frame(width: 32, height: 32)

            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 2) {
                    Text(notificationText)
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(2)
                    if isActorPlus && notification.actorUsername != nil {
                        PlusBadge()
                    }
                }

                // Lyric snippet
                if let snippet = notification.lyricSnippet {
                    Text("\u{201C}\(snippet)\u{201D}")
                        .font(Theme.caveat(16))
                        .foregroundStyle(Theme.textSecondary)
                        .lineLimit(1)
                }

                // Relative time
                Text(relativeDate(notification.createdAt))
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.textMuted)
            }

            Spacer()
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.vertical, 12)
    }

    // MARK: - Icon

    private var notificationIcon: some View {
        Group {
            switch notification.type {
            case "reaction":
                Image(systemName: "waveform.path")
                    .foregroundStyle(Theme.accent)
            case "comment", "reply":
                Image(systemName: "bubble.left")
                    .foregroundStyle(Theme.accent)
            case "new_lyric":
                Image(systemName: "music.note")
                    .foregroundStyle(Theme.accent)
            case "follow":
                Image(systemName: "person.badge.plus")
                    .foregroundStyle(Theme.accent)
            case "share":
                Image(systemName: "square.and.arrow.up")
                    .foregroundStyle(Theme.accent)
            case "collection_add":
                Image(systemName: "folder.badge.plus")
                    .foregroundStyle(Theme.accent)
            default:
                Image(systemName: "bell")
                    .foregroundStyle(Theme.textMuted)
            }
        }
        .font(.system(size: 16, weight: .medium))
    }

    // MARK: - Text

    private var notificationText: String {
        let actor = notification.actorUsername.map { "@\($0)" } ?? "Someone"
        switch notification.type {
        case "reaction":
            return "\(actor) resonated"
        case "comment":
            return "\(actor) commented"
        case "reply":
            return "\(actor) replied to your comment"
        case "follow":
            return "\(actor) followed you"
        case "share":
            return "\(actor) shared your lyric"
        case "new_lyric":
            if notification.followType == "tag", let value = notification.followValue {
                return "New lyric for #\(value)"
            }
            if let artist = notification.artistName {
                return "New lyric from \(artist)"
            }
            return "New lyric from someone you follow"
        case "collection_add":
            if let name = notification.collectionName {
                return "\(actor) added to \(name)"
            }
            return "\(actor) added to a collection"
        default:
            return "New activity"
        }
    }

    // MARK: - Date

    private func relativeDate(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "just now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        if interval < 86400 { return "\(Int(interval / 3600))h ago" }
        if interval < 604800 { return "\(Int(interval / 86400))d ago" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}
