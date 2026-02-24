import SwiftUI

struct ContentView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(AuthGate.self) private var authGate
    @Environment(SubscriptionGate.self) private var subscriptionGate
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
    @State private var anonBrowsing = false

    var body: some View {
        Group {
            if auth.isLoading {
                // Loading state
                ZStack {
                    Theme.Light.background
                        .ignoresSafeArea()
                    VStack(spacing: Theme.Spacing.md) {
                        Text("earwyrm")
                            .font(Theme.caveat(42))
                            .foregroundStyle(Theme.Light.text)
                        ProgressView()
                            .tint(Theme.Light.accent)
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
        .sheet(isPresented: Bindable(authGate).showAuthSheet) {
            LoginView()
        }
        .sheet(isPresented: Bindable(subscriptionGate).showPaywall) {
            EarwyrmPlusPaywall()
        }
        .onChange(of: auth.isAuthenticated) { _, isAuth in
            if isAuth {
                authGate.showAuthSheet = false
                anonBrowsing = false
            }
        }
        .animation(.easeInOut(duration: 0.3), value: auth.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: auth.isLoading)
        .animation(.easeInOut(duration: 0.4), value: hasSeenOnboarding)
        .animation(.easeInOut(duration: 0.3), value: anonBrowsing)
    }
}
