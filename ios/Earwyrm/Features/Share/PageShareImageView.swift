import SwiftUI

// MARK: - Page Share Image View (rendered offscreen via ImageRenderer)

struct PageShareImageView: View {
    let pageTitle: String
    let pageSubtitle: String?
    let statsLine: String
    let featuredLyric: String?
    let coverArtImage: UIImage?
    let format: ShareFormat
    let theme: ShareTheme
    let style: ShareStyle

    private var size: CGSize { format.size }

    private let marginX: CGFloat = 120
    private let borderWidth: CGFloat = 2
    private let ruleWidth: CGFloat = 80
    private let ruleHeight: CGFloat = 1.5

    private var titleSize: CGFloat {
        pageTitleFitSize
    }

    private var statsSize: CGFloat {
        24 * format.fontScale
    }

    private var lyricSize: CGFloat {
        36 * format.fontScale
    }

    private var brandSize: CGFloat {
        44 * format.fontScale
    }

    // Binary search for title font size that fits in available width
    private var pageTitleFitSize: CGFloat {
        let maxWidth = size.width - marginX * 2
        let minSize: CGFloat = 48 * format.fontScale
        let maxSize: CGFloat = 96 * format.fontScale

        var lo = minSize
        var hi = maxSize
        var best = minSize

        while lo <= hi {
            let mid = ((lo + hi) / 2).rounded(.down)
            let width = measureTitleWidth(pageTitle, fontSize: mid)
            if width <= maxWidth {
                best = mid
                lo = mid + 1
            } else {
                hi = mid - 1
            }
        }

        return best
    }

    private func measureTitleWidth(_ text: String, fontSize: CGFloat) -> CGFloat {
        let font = UIFont(name: "Caveat-SemiBold", size: fontSize)
            ?? UIFont.systemFont(ofSize: fontSize)
        let attributes: [NSAttributedString.Key: Any] = [.font: font]
        let attributedString = NSAttributedString(string: text, attributes: attributes)
        let maxSize = CGSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude)
        let rect = attributedString.boundingRect(
            with: maxSize,
            options: [.usesLineFragmentOrigin],
            context: nil
        )
        return ceil(rect.width)
    }

    var body: some View {
        ZStack {
            if style == .coverArt, let image = coverArtImage {
                coverArtLayout(image: image)
            } else {
                minimalLayout
            }
        }
        .frame(width: size.width, height: size.height)
    }

    // MARK: - Minimal Layout

    private var minimalLayout: some View {
        ZStack {
            theme.background

            RoundedRectangle(cornerRadius: 0)
                .strokeBorder(theme.border, lineWidth: borderWidth)

            cardContent()
        }
    }

    // MARK: - Cover Art Layout

    private func coverArtLayout(image: UIImage) -> some View {
        ZStack {
            theme.background

            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: size.width, height: size.height)
                .clipped()
                .opacity(0.08)

            RoundedRectangle(cornerRadius: 0)
                .strokeBorder(theme.border, lineWidth: borderWidth)

            cardContent()
        }
    }

    // MARK: - Card Content

    @ViewBuilder
    private func cardContent() -> some View {
        VStack(spacing: 0) {
            Spacer()
                .frame(minHeight: format == .story ? 300 : 180, maxHeight: format == .story ? 500 : 300)

            // Page title
            Text(pageTitle)
                .font(.custom("Caveat", size: titleSize).weight(.semibold))
                .foregroundStyle(theme.text)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Subtitle (artist + album for song pages)
            if let subtitle = pageSubtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(.custom("DM Sans", size: statsSize).italic())
                    .foregroundStyle(theme.secondary)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 8)
            }

            // Rule
            Spacer().frame(height: titleSize * 0.5)

            Rectangle()
                .fill(theme.accent.opacity(0.5))
                .frame(width: ruleWidth, height: ruleHeight)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Stats line
            Spacer().frame(height: titleSize * 0.35)

            Text(statsLine)
                .font(.custom("DM Sans", size: statsSize))
                .foregroundStyle(theme.secondary)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Featured lyric quote
            if let lyric = featuredLyric, !lyric.isEmpty {
                Spacer().frame(height: 40)

                Text("\"\(lyric)\"")
                    .font(.custom("Caveat", size: lyricSize).weight(.medium))
                    .foregroundStyle(theme.secondary)
                    .lineSpacing(lyricSize * 0.3)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Spacer()

            // Brand footer
            Text("earwyrm")
                .font(.custom("Caveat", size: brandSize).weight(.semibold))
                .foregroundStyle(theme.secondary.opacity(theme.brandOpacity))

            Spacer()
                .frame(height: format == .story ? 80 : 56)
        }
        .padding(.horizontal, marginX)
    }
}
