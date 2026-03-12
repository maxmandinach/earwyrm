import SwiftUI
import UIKit

/// Drop-in replacement for `AsyncImage` that uses `ImageCache.shared`
/// to avoid re-downloading images on every render.
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

    @State private var uiImage: UIImage?

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
            _uiImage = State(initialValue: cached)
        }
    }

    var body: some View {
        Group {
            if let uiImage {
                content(Image(uiImage: uiImage))
            } else {
                placeholder()
            }
        }
        .task(id: url) {
            // Skip if already loaded (cache hit in init or previous load)
            guard uiImage == nil else { return }
            await loadImage()
        }
    }

    private func loadImage() async {
        guard let url else { return }
        if let cached = ImageCache.shared.get(url) {
            uiImage = cached
            return
        }
        guard !Task.isCancelled else { return }
        if let image = await ImageCache.shared.image(for: url) {
            guard !Task.isCancelled else { return }
            uiImage = image
        }
    }
}

/// Phase-based variant matching `AsyncImage`'s phase API.
struct CachedAsyncImagePhased<Content: View>: View {
    let url: URL?
    let content: (AsyncImagePhase) -> Content

    @State private var phase: AsyncImagePhase = .empty

    init(url: URL?, @ViewBuilder content: @escaping (AsyncImagePhase) -> Content) {
        self.url = url
        self.content = content
        if let url, let cached = ImageCache.shared.get(url) {
            _phase = State(initialValue: .success(Image(uiImage: cached)))
        }
    }

    var body: some View {
        content(phase)
            .task(id: url) {
                guard case .empty = phase else { return }
                await loadImage()
            }
    }

    private func loadImage() async {
        guard let url else { return }
        if let cached = ImageCache.shared.get(url) {
            phase = .success(Image(uiImage: cached))
            return
        }
        guard !Task.isCancelled else { return }
        if let image = await ImageCache.shared.image(for: url) {
            guard !Task.isCancelled else { return }
            phase = .success(Image(uiImage: image))
        } else {
            phase = .failure(URLError(.badServerResponse))
        }
    }
}
