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

    // AI art
    var aiArtImage: UIImage?
    var aiArtURL: URL?
    private(set) var isGeneratingArt = false
    var aiArtError: String?
    var artRemaining: Int?
    var needsUpgrade = false
    var wasFreeTierGen = false

    func render(lyric: Lyric, note: String?, username: String?) {
        isRendering = true

        let view = ShareImageView(
            content: lyric.content,
            noteContent: note,
            songTitle: lyric.songTitle,
            artistName: lyric.artistName,
            coverArtImage: cachedCoverArt,
            aiArtImage: aiArtImage,
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

        // Pre-load existing card art if available
        if let cardArtUrlString = lyric.cardArtUrl, aiArtImage == nil {
            aiArtImage = await downloadImage(from: cardArtUrlString)
            if aiArtImage != nil {
                aiArtURL = URL(string: cardArtUrlString)
                style = .aiArt
            }
        }

        render(lyric: lyric, note: note, username: username)
    }

    func generateAIArt(lyric: Lyric, note: String?, username: String?) async {
        isGeneratingArt = true
        aiArtError = nil
        needsUpgrade = false
        wasFreeTierGen = false

        do {
            let result = try await CardArtService.generateArt(lyric: lyric, note: note)
            aiArtURL = result.url
            artRemaining = result.remaining
            wasFreeTierGen = result.isFreeTier
            aiArtImage = await CardArtService.downloadImage(from: result.url)
            style = .aiArt
            render(lyric: lyric, note: note, username: username)
            Analytics.track(.aiArtGenerated)
        } catch CardArtService.CardArtError.upgradeRequired {
            needsUpgrade = true
        } catch {
            aiArtError = error.localizedDescription
            print("AI art generation failed: \(error)")
        }

        isGeneratingArt = false
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

    var hasAIArt: Bool {
        aiArtImage != nil
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
