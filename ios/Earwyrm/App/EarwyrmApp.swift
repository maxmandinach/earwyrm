import SwiftUI

@main
struct EarwyrmApp: App {
    @State private var authManager = AuthManager()
    @State private var followManager = FollowManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
                .environment(followManager)
        }
    }
}
