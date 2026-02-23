import SwiftUI

@Observable
@MainActor
final class NavigationCoordinator {
    var pendingDestination: DeepLinkDestination?

    func handle(url: URL) {
        if let destination = DeepLinkRouter.destination(from: url) {
            pendingDestination = destination
        }
    }

    func consumeDestination() -> DeepLinkDestination? {
        let dest = pendingDestination
        pendingDestination = nil
        return dest
    }
}
