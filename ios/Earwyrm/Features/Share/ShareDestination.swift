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

    /// SF Symbol fallback when asset is missing
    var sfSymbol: String {
        switch self {
        case .igStories: "camera.circle.fill"
        case .messages: "message.fill"
        case .whatsapp: "phone.circle.fill"
        case .x: "at.circle.fill"
        case .threads: "at.circle.fill"
        case .tiktok: "play.circle.fill"
        case .copyLink: "link.circle.fill"
        case .more: "ellipsis.circle.fill"
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
        case .messages, .x, .tiktok, .more: true
        default: false
        }
    }
}
