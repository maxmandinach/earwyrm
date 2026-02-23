import Foundation

enum DeepLinkDestination: Hashable {
    case sharedLyric(shareToken: String)
    case profile(username: String)
}

enum DeepLinkRouter {
    /// Parses a URL into a deep link destination.
    /// Supports Universal Links (`https://earwyrm.app/s/{token}`)
    /// and custom scheme (`earwyrm://s/{token}`).
    static func destination(from url: URL) -> DeepLinkDestination? {
        // Universal Links: https://earwyrm.app/s/{token}
        // Custom scheme:   earwyrm://s/{token}
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        if let scheme = url.scheme, scheme == "earwyrm" {
            // earwyrm://s/{token} — host is "s", path has token
            if url.host == "s", let token = pathComponents.first {
                return .sharedLyric(shareToken: token)
            }
            // earwyrm://u/{username}
            if url.host == "u", let username = pathComponents.first {
                return .profile(username: username)
            }
        }

        // Universal Link: pathComponents = ["s", "{token}"]
        if pathComponents.count >= 2 {
            if pathComponents[0] == "s" {
                return .sharedLyric(shareToken: pathComponents[1])
            }
            if pathComponents[0] == "u" {
                return .profile(username: pathComponents[1])
            }
        }

        return nil
    }
}
