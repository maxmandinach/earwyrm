import SwiftUI
import UIKit

/// Drop-in replacement for `AsyncImage` that uses `ImageCache.shared`
/// to avoid re-downloading images on every render.
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

    @State private var uiImage: UIImage?
    @State private var failed = false

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        if let uiImage {
            content(Image(uiImage: uiImage))
        } else if failed {
            placeholder()
        } else {
            placeholder()
                .task(id: url) {
                    await loadImage()
                }
        }
    }

    private func loadImage() async {
        guard let url else {
            failed = true
            return
        }
        if let cached = ImageCache.shared.get(url) {
            uiImage = cached
            return
        }
        if let image = await ImageCache.shared.image(for: url) {
            uiImage = image
        } else {
            failed = true
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
    }

    var body: some View {
        content(phase)
            .task(id: url) {
                await loadImage()
            }
    }

    private func loadImage() async {
        guard let url else {
            phase = .empty
            return
        }
        if let cached = ImageCache.shared.get(url) {
            phase = .success(Image(uiImage: cached))
            return
        }
        if let image = await ImageCache.shared.image(for: url) {
            phase = .success(Image(uiImage: image))
        } else {
            phase = .failure(URLError(.badServerResponse))
        }
    }
}
