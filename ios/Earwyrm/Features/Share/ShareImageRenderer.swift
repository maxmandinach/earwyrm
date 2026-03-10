import SwiftUI

@Observable
@MainActor
final class ShareImageRenderer {
    var format: ShareFormat = .square
    var theme: ShareTheme = .light
    var style: ShareStyle = .minimal
    var emphasis: ShareEmphasis = .lyricOnly
    var renderedImage: UIImage?

    private(set) var isRendering = false
    private var cachedCoverArt: UIImage?
    private var cachedCoverArtUrl: String?

    func render(lyric: Lyric, note: String?, username: String?, isPlus: Bool = false, aiArtImage: UIImage? = nil) {
        isRendering = true

        let view = makeView(lyric: lyric, note: note, username: username, isPlus: isPlus, aiArtImage: aiArtImage)
        let size = format.size

        Task { @MainActor in
            let renderer = ImageRenderer(content: view)
            renderer.scale = 3.0
            renderer.proposedSize = .init(size)
            self.renderedImage = renderer.uiImage
            self.isRendering = false
        }
    }

    /// Render and return the image, awaiting completion. Used by share destinations
    /// that need the final image before proceeding.
    func renderAndWait(lyric: Lyric, note: String?, username: String?, isPlus: Bool = false, aiArtImage: UIImage? = nil) async -> UIImage? {
        isRendering = true
        let view = makeView(lyric: lyric, note: note, username: username, isPlus: isPlus, aiArtImage: aiArtImage)
        let size = format.size

        let renderer = ImageRenderer(content: view)
        renderer.scale = 3.0
        renderer.proposedSize = .init(size)
        let image = renderer.uiImage

        renderedImage = image
        isRendering = false
        return image
    }

    private func makeView(lyric: Lyric, note: String?, username: String?, isPlus: Bool = false, aiArtImage: UIImage? = nil) -> ShareImageView {
        ShareImageView(
            content: lyric.content,
            noteContent: note,
            songTitle: lyric.songTitle,
            artistName: lyric.artistName,
            coverArtImage: cachedCoverArt,
            aiArtImage: aiArtImage,
            username: username,
            isPlus: isPlus,
            format: format,
            theme: theme,
            style: style,
            emphasis: emphasis
        )
    }

    func loadCoverArt(for lyric: Lyric) async {
        if let urlString = lyric.coverArtUrl, urlString != cachedCoverArtUrl {
            guard let url = URL(string: urlString) else { return }
            cachedCoverArt = await ImageCache.shared.image(for: url)
            cachedCoverArtUrl = urlString
        }
    }

    func toggleFormat() {
        format = format == .square ? .story : .square
    }

    func toggleTheme() {
        theme = theme == .light ? .dark : .light
    }

    func toggleStyle() {
        style = style == .minimal ? .coverArt : .minimal
    }

    func hasCoverArt(lyric: Lyric) -> Bool {
        lyric.coverArtUrl != nil
    }

}
