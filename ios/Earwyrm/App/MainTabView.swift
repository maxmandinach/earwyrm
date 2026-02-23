import SwiftUI

struct MainTabView: View {
    @Environment(NavigationCoordinator.self) private var navCoordinator
    @Environment(AuthManager.self) private var auth
    @Environment(NotificationManager.self) private var notificationManager
    @Environment(UserFollowManager.self) private var userFollowManager
    @Environment(CollectionManager.self) private var collectionManager
    @State private var selectedTab = 0
    @State private var homePath = NavigationPath()
    @State private var scrollToTopTrigger: [Int: Bool] = [0: false, 1: false, 2: false, 3: false]

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(
                navigationPath: $homePath,
                scrollToTop: scrollToTopTrigger[0] ?? false
            )
                .toolbar(.hidden, for: .tabBar)
                .tag(0)

            ExploreView(scrollToTop: scrollToTopTrigger[1] ?? false)
                .toolbar(.hidden, for: .tabBar)
                .tag(1)

            ActivityView(scrollToTop: scrollToTopTrigger[2] ?? false)
                .toolbar(.hidden, for: .tabBar)
                .tag(2)

            ProfileView(scrollToTop: scrollToTopTrigger[3] ?? false)
                .toolbar(.hidden, for: .tabBar)
                .tag(3)
        }
        .safeAreaInset(edge: .bottom) {
            EarwyrmTabBar(
                selectedTab: $selectedTab,
                hasUnreadActivity: notificationManager.unreadCount > 0,
                onSameTabTapped: { tab in
                    scrollToTopTrigger[tab]?.toggle()
                }
            )
        }
        .task {
            if let userId = auth.userId {
                await userFollowManager.fetchFollowing(userId: userId)
                await notificationManager.fetchUnreadCount(
                    userId: userId,
                    lastSeenAt: auth.profile?.lastActivitySeenAt
                )
                await collectionManager.fetchCollections(userId: userId)
                PushManager.shared.requestPermission()
            }
        }
        .onChange(of: selectedTab) { _, newTab in
            if newTab == 2 {
                Task {
                    if let userId = auth.userId {
                        await notificationManager.markAllSeen(userId: userId)
                    }
                }
            }
        }
        .onChange(of: navCoordinator.pendingDestination) { _, newValue in
            guard let destination = navCoordinator.consumeDestination() else { return }
            // Switch to Home tab and push destination
            selectedTab = 0
            // Small delay to ensure tab switch completes
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                homePath.append(destination)
            }
        }
    }
}

// MARK: - Custom Tab Bar

struct EarwyrmTabBar: View {
    @Binding var selectedTab: Int
    var hasUnreadActivity: Bool = false
    var onSameTabTapped: ((Int) -> Void)?

    var body: some View {
        HStack(spacing: 0) {
            // Home — branded "e" in Caveat
            tabButton(index: 0, label: "Home") {
                CaveatText(
                    text: "e",
                    size: 36,
                    weight: .bold,
                    color: selectedTab == 0 ? Theme.Light.accent : Theme.Light.muted
                )
            }

            // Explore — magnifying glass
            tabButton(index: 1, label: "Explore") {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18, weight: .medium))
            }

            // Activity — waveform bars + badge
            tabButton(index: 2, label: "Activity") {
                TabWaveformIcon(size: 20)
                    .overlay(alignment: .topTrailing) {
                        if hasUnreadActivity {
                            Circle()
                                .fill(Color(hex: "#D4756A"))
                                .frame(width: 7, height: 7)
                                .offset(x: 3, y: -2)
                        }
                    }
            }
            .accessibilityValue(hasUnreadActivity ? "unread notifications" : "")

            // Profile — person
            tabButton(index: 3, label: "Profile") {
                Image(systemName: "person")
                    .font(.system(size: 18, weight: .medium))
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(
            Theme.Light.background
                .shadow(color: .black.opacity(0.04), radius: 4, y: -1)
                .ignoresSafeArea(edges: .bottom)
        )
    }

    private func tabButton<Icon: View>(
        index: Int,
        label: String,
        @ViewBuilder icon: () -> Icon
    ) -> some View {
        Button {
            if selectedTab == index {
                onSameTabTapped?(index)
            } else {
                selectedTab = index
            }
            Haptics.light()
        } label: {
            VStack(spacing: 2) {
                icon()
                    .frame(minHeight: 24)
                Text(label)
                    .font(Theme.dmSans(10))
            }
            .foregroundStyle(selectedTab == index ? Theme.Light.accent : Theme.Light.muted)
            .frame(maxWidth: .infinity)
        }
        .accessibilityLabel(label)
    }
}

// MARK: - Static Waveform Icon (Tab Bar)

/// Simplified 5-bar waveform for the Activity tab icon.
/// Inherits foreground color from parent.
private struct TabWaveformIcon: View {
    let size: CGFloat
    private let heights: [CGFloat] = [0.35, 0.6, 0.85, 0.6, 0.35]

    var body: some View {
        HStack(alignment: .center, spacing: size * 0.08) {
            ForEach(0..<5, id: \.self) { index in
                RoundedRectangle(cornerRadius: size * 0.06)
                    .frame(width: max(size * 0.1, 1.5), height: heights[index] * size)
            }
        }
        .frame(width: size, height: size)
    }
}
