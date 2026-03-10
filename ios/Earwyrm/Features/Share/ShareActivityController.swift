import SwiftUI
import UIKit
import LinkPresentation

struct ShareActivityController: UIViewControllerRepresentable {
    let items: [Any]
    var onComplete: ((Bool) -> Void)?

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(
            activityItems: items,
            applicationActivities: nil
        )
        controller.completionWithItemsHandler = { _, completed, _, _ in
            onComplete?(completed)
        }
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Image + Link Activity Item Source

/// Provides the share image as the primary item with link metadata.
/// Messages shows the image inline; other apps get both image + link.
final class ShareImageItemSource: NSObject, UIActivityItemSource {
    let image: UIImage
    let url: URL?
    let title: String

    init(image: UIImage, url: URL?, title: String = "earwyrm") {
        self.image = image
        self.url = url
        self.title = title
    }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
        return image
    }

    func activityViewController(
        _ activityViewController: UIActivityViewController,
        itemForActivityType activityType: UIActivity.ActivityType?
    ) -> Any? {
        return image
    }

    func activityViewControllerLinkMetadata(_ activityViewController: UIActivityViewController) -> LPLinkMetadata? {
        let metadata = LPLinkMetadata()
        metadata.title = title
        if let url { metadata.originalURL = url }
        metadata.imageProvider = NSItemProvider(object: image)
        return metadata
    }
}

/// Provides the share link as a separate text item, excluded from Messages
/// (which would convert it to a rich link preview and hide the image).
final class ShareLinkItemSource: NSObject, UIActivityItemSource {
    let url: URL

    init(url: URL) {
        self.url = url
    }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
        return url
    }

    func activityViewController(
        _ activityViewController: UIActivityViewController,
        itemForActivityType activityType: UIActivity.ActivityType?
    ) -> Any? {
        return url
    }
}
