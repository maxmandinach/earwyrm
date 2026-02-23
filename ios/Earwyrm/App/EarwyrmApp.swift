import SwiftUI
import UIKit

@main
struct EarwyrmApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var authManager = AuthManager()
    @State private var followManager = FollowManager()
    @State private var userFollowManager = UserFollowManager()
    @State private var notificationManager = NotificationManager()
    @State private var collectionManager = CollectionManager()
    @State private var navigationCoordinator = NavigationCoordinator()

    init() {
        let bg = UIColor(Theme.Light.background)
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = bg
        appearance.shadowColor = .clear
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
                .environment(followManager)
                .environment(userFollowManager)
                .environment(notificationManager)
                .environment(collectionManager)
                .environment(navigationCoordinator)
                .onOpenURL { url in
                    navigationCoordinator.handle(url: url)
                }
        }
    }
}
