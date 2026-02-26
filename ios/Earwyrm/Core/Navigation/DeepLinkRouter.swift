import Foundation

enum DeepLinkDestination: Hashable {
    case sharedLyric(shareToken: String)
    case profile(username: String)
    case artist(name: String)
    case song(title: String, artistName: String?)
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
            // earwyrm://artist/{slug}
            if url.host == "artist", let slug = pathComponents.first {
                return .artist(name: slugToName(slug))
            }
            // earwyrm://song/{slug}?artist={name}
            if url.host == "song", let slug = pathComponents.first {
                let artist = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                    .queryItems?.first(where: { $0.name == "artist" })?.value
                return .song(title: slugToName(slug), artistName: artist)
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
            if pathComponents[0] == "artist" {
                return .artist(name: slugToName(pathComponents[1]))
            }
            if pathComponents[0] == "song" {
                let artist = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                    .queryItems?.first(where: { $0.name == "artist" })?.value
                return .song(title: slugToName(pathComponents[1]), artistName: artist)
            }
        }

        return nil
    }

    /// Converts a URL slug like "taylor-swift" back to "Taylor Swift"
    private static func slugToName(_ slug: String) -> String {
        slug.removingPercentEncoding?
            .replacingOccurrences(of: "-", with: " ")
            .capitalized ?? slug
    }
}
