import SwiftUI
import UIKit

enum ShareDestination: String, CaseIterable, Identifiable {
    case igStories
    case messages
    case whatsapp
    case x
    case threads
    case tiktok
    case copyLink
    case more

    var id: String { rawValue }

    var label: String {
        switch self {
        case .igStories: "Stories"
        case .messages: "Messages"
        case .whatsapp: "WhatsApp"
        case .x: "X"
        case .threads: "Threads"
        case .tiktok: "TikTok"
        case .copyLink: "Copy Link"
        case .more: "More"
        }
    }

    var format: ShareFormat {
        switch self {
        case .igStories, .tiktok: .story
        case .messages, .whatsapp, .x, .threads, .more: .square
        case .copyLink: .square
        }
    }

    /// Asset catalog name for branded icon; nil means use SF Symbol
    var iconAsset: String? {
        switch self {
        case .igStories: "share-ig-stories"
        case .messages: "share-messages"
        case .whatsapp: "share-whatsapp"
        case .x: "share-x"
        case .threads: "share-threads"
        case .tiktok: "share-tiktok"
        case .copyLink, .more: nil
        }
    }

    /// SF Symbol for icon overlay (white on colored background)
    var sfSymbol: String {
        switch self {
        case .igStories: "camera.fill"
        case .messages: "message.fill"
        case .whatsapp: "phone.fill"
        case .x: "xmark" // Bold X shape, matches brand
        case .threads: "at"
        case .tiktok: "music.note"
        case .copyLink: "link"
        case .more: "ellipsis"
        }
    }

    /// Brand background color for the icon tile
    var iconBackground: Color {
        switch self {
        case .igStories: Color(red: 0.88, green: 0.19, blue: 0.42)
        case .messages: Color(red: 0.20, green: 0.78, blue: 0.35)
        case .whatsapp: Color(red: 0.15, green: 0.68, blue: 0.38)
        case .x: .black
        case .threads: .black
        case .tiktok: .black
        case .copyLink: Color(UIColor.systemGray)
        case .more: Color(UIColor.systemGray)
        }
    }

    /// Whether the icon needs a border to be visible in dark mode
    var needsDarkModeBorder: Bool {
        switch self {
        case .x, .threads, .tiktok: true
        default: false
        }
    }

    /// Whether icon uses a gradient background (e.g. Instagram)
    var iconGradient: LinearGradient? {
        switch self {
        case .igStories:
            return LinearGradient(
                colors: [
                    Color(red: 0.99, green: 0.84, blue: 0.21),
                    Color(red: 0.95, green: 0.30, blue: 0.18),
                    Color(red: 0.75, green: 0.15, blue: 0.65)
                ],
                startPoint: .bottomLeading,
                endPoint: .topTrailing
            )
        default: return nil
        }
    }

    /// URL scheme used for `canOpenURL` install detection
    var urlScheme: String? {
        switch self {
        case .igStories: "instagram-stories"
        case .whatsapp: "whatsapp"
        case .x: "twitter"
        case .threads: "barcelona"
        case .tiktok: "snssdk1128"
        case .messages, .copyLink, .more: nil
        }
    }

    /// Whether this destination is available on the current device
    var isAvailable: Bool {
        guard let scheme = urlScheme,
              let url = URL(string: "\(scheme)://") else {
            return true // always-available destinations
        }
        return UIApplication.shared.canOpenURL(url)
    }

    /// All destinations that are currently available
    static var available: [ShareDestination] {
        allCases.filter(\.isAvailable)
    }

    /// Whether this destination uses the system activity sheet
    var usesSystemSheet: Bool {
        switch self {
        case .messages, .tiktok, .more: true
        default: false
        }
    }
}
