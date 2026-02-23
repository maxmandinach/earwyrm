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

    func render(lyric: Lyric, note: String?, username: String?) {
        isRendering = true

        let view = ShareImageView(
            content: lyric.content,
            noteContent: note,
            songTitle: lyric.songTitle,
            artistName: lyric.artistName,
            coverArtImage: cachedCoverArt,
            username: username,
            format: format,
            theme: theme,
            style: style,
            emphasis: emphasis
        )

        let renderer = ImageRenderer(content: view)
        renderer.scale = 3.0
        renderer.proposedSize = .init(format.size)

        renderedImage = renderer.uiImage
        isRendering = false
    }

    func initialRender(lyric: Lyric, note: String?, username: String?) async {
        if let urlString = lyric.coverArtUrl, urlString != cachedCoverArtUrl {
            cachedCoverArt = await downloadImage(from: urlString)
            cachedCoverArtUrl = urlString
        }
        render(lyric: lyric, note: note, username: username)
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

    private func downloadImage(from urlString: String) async -> UIImage? {
        guard let url = URL(string: urlString) else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            return UIImage(data: data)
        } catch {
            print("Failed to download cover art: \(error)")
            return nil
        }
    }
}
