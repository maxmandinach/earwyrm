import SwiftUI

struct ContentView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(AuthGate.self) private var authGate
    @Environment(SubscriptionGate.self) private var subscriptionGate
    @Environment(UserFollowManager.self) private var userFollowManager
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(FollowManager.self) private var followManager
    @Environment(ToastManager.self) private var toastManager
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
    @AppStorage("hasSeenInterestPicker") private var hasSeenInterestPicker = false
    @State private var anonBrowsing = false
    @State private var showInterestPicker = false

    var body: some View {
        ZStack {
        Group {
            if auth.isLoading {
                // Loading state
                ZStack {
                    Theme.background
                        .ignoresSafeArea()
                    VStack(spacing: Theme.Spacing.md) {
                        Text("earwyrm")
                            .font(Theme.caveat(42))
                            .foregroundStyle(Theme.textPrimary)
                        ProgressView()
                            .tint(Theme.accent)
                    }
                }
            } else if !hasSeenOnboarding {
                OnboardingView {
                    hasSeenOnboarding = true
                }
            } else if auth.isAuthenticated {
                MainTabView()
            } else if anonBrowsing {
                ExploreView()
            } else {
                LoginView(onExplore: { anonBrowsing = true })
            }
        }
        OfflineBanner()
        ToastOverlay()
        }
        .sheet(isPresented: Bindable(authGate).showAuthSheet) {
            LoginView()
        }
        .sheet(isPresented: Bindable(subscriptionGate).showPaywall) {
            EarwyrmPlusPaywall()
        }
        .sheet(isPresented: $showInterestPicker) {
            InterestPickerSheet()
                .presentationDetents([.large])
        }
        .onChange(of: auth.isAuthenticated) { _, isAuth in
            if isAuth {
                authGate.showAuthSheet = false
                anonBrowsing = false
                if !hasSeenInterestPicker && followManager.follows.isEmpty {
                    showInterestPicker = true
                    Analytics.track(.interestPickerShown)
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: auth.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: auth.isLoading)
        .animation(.easeInOut(duration: 0.4), value: hasSeenOnboarding)
        .animation(.easeInOut(duration: 0.3), value: anonBrowsing)
        .task {
            userFollowManager.toast = toastManager
            collectionManager.toast = toastManager
        }
    }
}
