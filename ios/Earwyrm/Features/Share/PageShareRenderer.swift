import SwiftUI

@Observable
@MainActor
final class PageShareRenderer {
    var format: ShareFormat = .square
    var theme: ShareTheme = .light
    var style: ShareStyle = .minimal
    var renderedImage: UIImage?

    private(set) var isRendering = false
    private var cachedCoverArt: UIImage?
    private var cachedCoverArtUrl: String?

    func render(
        pageTitle: String,
        pageSubtitle: String?,
        stats: PageStats,
        featuredLyric: String?
    ) {
        isRendering = true

        let view = PageShareImageView(
            pageTitle: pageTitle,
            pageSubtitle: pageSubtitle,
            statsLine: formatStatsLine(stats),
            featuredLyric: featuredLyric,
            coverArtImage: cachedCoverArt,
            format: format,
            theme: theme,
            style: style
        )

        let renderer = ImageRenderer(content: view)
        renderer.scale = 3.0
        renderer.proposedSize = .init(format.size)

        renderedImage = renderer.uiImage
        isRendering = false
    }

    func initialRender(
        pageTitle: String,
        pageSubtitle: String?,
        stats: PageStats,
        featuredLyric: String?,
        coverArtUrl: String?
    ) async {
        if let urlString = coverArtUrl, urlString != cachedCoverArtUrl {
            cachedCoverArt = await downloadImage(from: urlString)
            cachedCoverArtUrl = urlString
        }
        render(pageTitle: pageTitle, pageSubtitle: pageSubtitle, stats: stats, featuredLyric: featuredLyric)
    }

    func hasCoverArt(url: String?) -> Bool {
        url != nil
    }

    private func formatStatsLine(_ stats: PageStats) -> String {
        var parts: [String] = []
        parts.append("\(stats.lyricCount) lyric\(stats.lyricCount == 1 ? "" : "s")")
        if stats.uniqueUsers > 1 {
            parts.append("\(stats.uniqueUsers) people")
        }
        if stats.totalResonances > 0 {
            parts.append("\(stats.totalResonances) resonance\(stats.totalResonances == 1 ? "" : "s")")
        }
        return parts.joined(separator: " · ")
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
