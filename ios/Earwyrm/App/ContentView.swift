import SwiftUI

struct ContentView: View {
    @Environment(AuthManager.self) private var auth

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
            } else if auth.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: auth.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: auth.isLoading)
    }
}
