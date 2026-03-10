import SwiftUI

// MARK: - Share Card Types

enum ShareFormat: String, CaseIterable {
    case square
    case story

    var size: CGSize {
        switch self {
        case .square: CGSize(width: 1080, height: 1080)
        case .story: CGSize(width: 1080, height: 1920)
        }
    }

    var fontScale: CGFloat {
        switch self {
        case .square: 1.0
        case .story: 1.2
        }
    }
}

enum ShareStyle: String, CaseIterable {
    case minimal
    case coverArt
    case aiArt

    var label: String {
        switch self {
        case .minimal: "Minimal"
        case .coverArt: "Cover Art"
        case .aiArt: "AI Art"
        }
    }

    var icon: String {
        switch self {
        case .minimal: "text.quote"
        case .coverArt: "photo"
        case .aiArt: "wand.and.stars"
        }
    }
}

enum ShareTheme: String, CaseIterable {
    case light
    case dark

    var background: Color {
        switch self {
        case .light: Color(hex: "#F5F2ED")
        case .dark: Color(hex: "#252220")
        }
    }

    var text: Color {
        switch self {
        case .light: Color(hex: "#2C2825")
        case .dark: Color(hex: "#FAF8F5")
        }
    }

    var secondary: Color {
        switch self {
        case .light: Color(hex: "#6B635A")
        case .dark: Color(hex: "#C8C0B5")
        }
    }

    var accent: Color {
        switch self {
        case .light: Color(hex: "#B8A99A")
        case .dark: Color(hex: "#C8B8A8")
        }
    }

    var border: Color {
        switch self {
        case .light: Color(hex: "#D4CFC4")
        case .dark: Color(hex: "#4A4540")
        }
    }

    var usernameOpacity: CGFloat {
        switch self {
        case .light: 0.4
        case .dark: 0.6
        }
    }

    var brandOpacity: CGFloat {
        switch self {
        case .light: 0.65
        case .dark: 0.85
        }
    }

    var icon: String {
        switch self {
        case .light: "moon.fill"
        case .dark: "sun.max.fill"
        }
    }
}

enum ShareEmphasis: String, CaseIterable {
    case lyricOnly
    case lyricAndNote

    var label: String {
        switch self {
        case .lyricOnly: "Lyric"
        case .lyricAndNote: "Lyric + Note"
        }
    }
}

// MARK: - Share Image View (rendered offscreen via ImageRenderer)

struct ShareImageView: View {
    let content: String
    let noteContent: String?
    let songTitle: String?
    let artistName: String?
    let coverArtImage: UIImage?
    let aiArtImage: UIImage?
    let username: String?
    let isPlus: Bool
    let format: ShareFormat
    let theme: ShareTheme
    let style: ShareStyle
    let emphasis: ShareEmphasis

    private var size: CGSize { format.size }

    private let marginX: CGFloat = 120
    private let borderWidth: CGFloat = 2
    private let ruleWidth: CGFloat = 80
    private let ruleHeight: CGFloat = 1.5

    private var attributionSize: CGFloat {
        24 * format.fontScale
    }

    private var brandSize: CGFloat {
        44 * format.fontScale
    }

    private var labelSize: CGFloat {
        20 * format.fontScale
    }

    // Footer height: username + gap + brand + bottom pad
    private var footerHeight: CGFloat {
        let bottomPad: CGFloat = format == .story ? 80 : 56
        let brandH: CGFloat = brandSize * 1.4
        let usernameH: CGFloat = username != nil ? (attributionSize * 0.85 * 1.4 + 16) : 0
        return usernameH + brandH + bottomPad
    }

    private var fitResult: ShareTextFitter.FitResult {
        let heroText: String
        let secondaryText: String?

        switch emphasis {
        case .lyricOnly:
            heroText = content
            secondaryText = nil
        case .lyricAndNote:
            heroText = content
            secondaryText = noteContent
        }

        return ShareTextFitter.fit(
            heroContent: heroText,
            secondaryContent: secondaryText,
            format: format
        )
    }

    var body: some View {
        ZStack {
            if style == .aiArt, let image = aiArtImage {
                aiArtLayout(image: image)
            } else if style == .coverArt, let image = coverArtImage {
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

    // MARK: - AI Art Layout

    private func aiArtLayout(image: UIImage) -> some View {
        ZStack {
            // Solid backing to prevent transparency artifacts
            theme.background

            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: size.width, height: size.height)
                .clipped()
                .opacity(0.8)

            // Gradient overlay for text legibility
            LinearGradient(
                colors: [
                    theme.background.opacity(0.3),
                    theme.background.opacity(0.6),
                    theme.background.opacity(0.85)
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            cardContent()
        }
    }

    // MARK: - Card Content (footer always anchored at bottom)

    @ViewBuilder
    private func cardContent() -> some View {
        let fit = fitResult

        ZStack(alignment: .bottom) {
            // Main content — top-aligned, stops above footer
            VStack(spacing: 0) {
                Spacer()
                    .frame(
                        minHeight: emphasis == .lyricAndNote
                            ? (format == .story ? 120 : 60)
                            : (format == .story ? 240 : 120),
                        maxHeight: emphasis == .lyricAndNote
                            ? (format == .story ? 240 : 120)
                            : (format == .story ? 440 : 240)
                    )

                switch emphasis {
                case .lyricOnly:
                    lyricOnlyContent(fit: fit)
                case .lyricAndNote:
                    lyricAndNoteContent(fit: fit)
                }

                Spacer()
            }
            .padding(.horizontal, marginX)
            .padding(.bottom, footerHeight)

            // Footer — always visible at bottom
            VStack(spacing: 0) {
                footerBrand()

                Spacer()
                    .frame(height: format == .story ? 80 : 56)
            }
            .padding(.horizontal, marginX)
        }
    }

    // MARK: - Lyric Only (classic card, no note)

    @ViewBuilder
    private func lyricOnlyContent(fit: ShareTextFitter.FitResult) -> some View {
        Text(fit.heroText)
            .font(.custom("Caveat", size: fit.heroFontSize).weight(.medium))
            .foregroundStyle(theme.text)
            .lineSpacing(fit.heroFontSize * 0.35)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)

        Spacer()
            .frame(height: fit.heroFontSize * 0.6)

        rule()

        Spacer()
            .frame(height: fit.heroFontSize * 0.4)

        attributionRow(textColor: theme.secondary)
    }

    // MARK: - Lyric + Note (lyric hero, note secondary)

    @ViewBuilder
    private func lyricAndNoteContent(fit: ShareTextFitter.FitResult) -> some View {
        // Hero: Lyric
        Text(fit.heroText)
            .font(.custom("Caveat", size: fit.heroFontSize).weight(.medium))
            .foregroundStyle(theme.text)
            .lineSpacing(fit.heroFontSize * 0.35)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)

        Spacer()
            .frame(height: fit.heroFontSize * 0.6)

        rule()

        Spacer()
            .frame(height: fit.heroFontSize * 0.4)

        // Attribution
        attributionRow(textColor: theme.secondary)

        // Note secondary
        if let secondaryText = fit.secondaryText, !secondaryText.isEmpty {
            Spacer()
                .frame(height: 28)

            Text("my note")
                .font(.custom("Cochin", size: labelSize))
                .foregroundStyle(theme.accent)
                .frame(maxWidth: .infinity, alignment: .leading)

            Spacer()
                .frame(height: 8)

            HStack(spacing: 0) {
                Rectangle()
                    .fill(theme.accent)
                    .frame(width: 3)

                Spacer()
                    .frame(width: 14)

                Text(secondaryText)
                    .font(.custom("Cochin", size: fit.secondaryFontSize))
                    .foregroundStyle(theme.secondary)
                    .lineSpacing(fit.secondaryFontSize * 0.4)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    // MARK: - Shared Components

    private func rule() -> some View {
        Rectangle()
            .fill(theme.accent.opacity(0.5))
            .frame(width: ruleWidth, height: ruleHeight)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func footerBrand() -> some View {
        if let username {
            HStack(spacing: attributionSize * 0.3) {
                Text("@\(username)")
                    .font(.custom("DM Sans", size: attributionSize * 0.85))
                    .foregroundStyle(theme.secondary.opacity(theme.usernameOpacity))
                if isPlus {
                    Text("e+")
                        .font(.custom("Caveat", size: attributionSize * 0.85).weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, attributionSize * 0.35)
                        .padding(.vertical, attributionSize * 0.1)
                        .background(
                            LinearGradient(
                                colors: [Color(hex: "#C8B8A8"), Color(hex: "#A08878")],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: attributionSize * 0.25))
                }
            }

            Spacer()
                .frame(height: 16)
        }

        Text("earwyrm")
            .font(.custom("Caveat", size: brandSize).weight(.semibold))
            .foregroundStyle(theme.secondary.opacity(theme.brandOpacity))
    }

    @ViewBuilder
    private func attributionRow(textColor: Color) -> some View {
        if songTitle != nil || artistName != nil {
            HStack(spacing: attributionSize * 0.5) {
                if let image = coverArtImage {
                    let thumbSize = attributionSize * 2.4
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: thumbSize, height: thumbSize)
                        .clipShape(RoundedRectangle(cornerRadius: thumbSize * 0.1))
                }

                let parts = [songTitle, artistName].compactMap { $0 }
                Text(parts.joined(separator: " — "))
                    .font(.custom("DM Sans", size: attributionSize).italic())
                    .foregroundStyle(textColor)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
