import SwiftUI
import UIKit

/// Drop-in replacement for `AsyncImage` that eliminates the flash on revisit.
///
/// - Cache hit: renders the image immediately on the first frame (no placeholder, no flash)
/// - Cache miss: delegates to Apple's `AsyncImage` for reliable downloading,
///   then stores the result in `ImageCache` for next time
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

    @State private var cachedImage: UIImage?

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
        // Check cache synchronously so cached images render on first frame
        if let url, let cached = ImageCache.shared.get(url) {
            _cachedImage = State(initialValue: cached)
        }
    }

    var body: some View {
        if cachedImage != nil {
            // Cache hit — instant, no network
            content(Image(uiImage: cachedImage!))
        } else {
            // Cache miss — let AsyncImage handle downloading reliably
            AsyncImage(url: url) { image in
                content(image)
                    .onAppear { cacheLoadedImage() }
            } placeholder: {
                placeholder()
            }
        }
    }

    /// Download the image into our cache in the background so it's instant next time.
    /// AsyncImage uses its own internal loading; this populates our ImageCache separately.
    private func cacheLoadedImage() {
        guard let url, ImageCache.shared.get(url) == nil else { return }
        Task.detached(priority: .utility) {
            _ = await ImageCache.shared.image(for: url)
        }
    }
}

/// Phase-based variant matching `AsyncImage`'s phase API.
struct CachedAsyncImagePhased<Content: View>: View {
    let url: URL?
    let content: (AsyncImagePhase) -> Content

    @State private var cachedPhase: AsyncImagePhase?

    init(url: URL?, @ViewBuilder content: @escaping (AsyncImagePhase) -> Content) {
        self.url = url
        self.content = content
        if let url, let cached = ImageCache.shared.get(url) {
            _cachedPhase = State(initialValue: .success(Image(uiImage: cached)))
        }
    }

    var body: some View {
        if let cachedPhase {
            content(cachedPhase)
        } else {
            AsyncImage(url: url) { phase in
                content(phase)
                    .onAppear {
                        if case .success = phase {
                            cacheLoadedImage()
                        }
                    }
            }
        }
    }

    private func cacheLoadedImage() {
        guard let url, ImageCache.shared.get(url) == nil else { return }
        Task.detached(priority: .utility) {
            _ = await ImageCache.shared.image(for: url)
        }
    }
}
