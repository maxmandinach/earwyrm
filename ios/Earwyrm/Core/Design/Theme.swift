import SwiftUI
import UIKit

enum Theme {
    // MARK: - Adaptive Colors
    static let background = Color("background")
    static let card = Color("card")
    static let textPrimary = Color("textPrimary")
    static let textSecondary = Color("textSecondary")
    static let textMuted = Color("textMuted")
    static let accent = Color("accent")
    static let dividerColor = Color("dividerColor")

    // MARK: - Typography (scales with Dynamic Type)
    static func caveat(_ size: CGFloat = 28, weight: Font.Weight = .medium) -> Font {
        .custom("Caveat", size: size, relativeTo: textStyle(for: size)).weight(weight)
    }

    static func dmSans(_ size: CGFloat = 15, weight: Font.Weight = .regular) -> Font {
        .custom("DM Sans", size: size, relativeTo: textStyle(for: size)).weight(weight)
    }

    static func dmSansItalic(_ size: CGFloat = 15) -> Font {
        .custom("DM Sans", size: size, relativeTo: textStyle(for: size)).italic()
    }

    /// Cochin — used for notes (personal reflections)
    static func noteFont(_ size: CGFloat = 16) -> Font {
        .custom("Cochin", size: size, relativeTo: textStyle(for: size))
    }

    private static func textStyle(for size: CGFloat) -> Font.TextStyle {
        switch size {
        case ...11: .caption2
        case 12: .caption
        case 13: .footnote
        case 14: .subheadline
        case 15...16: .body
        case 17...19: .title3
        case 20...23: .title2
        case 24...33: .title
        default: .largeTitle
        }
    }

    // MARK: - Spacing
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // MARK: - Shadows
    static let cardShadow: some ShapeStyle = Color.black.opacity(0.08)
    static let cardShadowRadius: CGFloat = 12
    static let cardShadowY: CGFloat = 4
}

// MARK: - Brand Header Modifier

/// Adds the persistent "earwyrm" wordmark to the navigation bar's leading position.
/// Apply inside a NavigationStack on the root content view.
struct EarwyrmBrandHeader: ViewModifier {
    func body(content: Content) -> some View {
        content
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    CaveatText(text: "earwyrm", size: 24, weight: .semibold, color: Theme.textSecondary)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
    }
}

extension View {
    func earwyrmBranding() -> some View {
        modifier(EarwyrmBrandHeader())
    }
}

// MARK: - CaveatText (UIKit-rendered to avoid SwiftUI clipping)

/// Renders Caveat text through UIKit to prevent SwiftUI's Text view from
/// clipping glyphs that extend past the font's reported metrics.
/// Use for short text: section headers, initials, brand marks.
struct CaveatText: View {
    let text: String
    let size: CGFloat
    var weight: CaveatWeight = .medium
    var color: Color = .primary

    enum CaveatWeight {
        case medium, semibold, bold

        var fontName: String {
            switch self {
            case .medium: "Caveat-Medium"
            case .semibold: "Caveat-SemiBold"
            case .bold: "Caveat-Bold"
            }
        }
    }

    var body: some View {
        Image(uiImage: renderText())
            .renderingMode(.template)
            .foregroundStyle(color)
            .accessibilityLabel(text)
    }

    private func renderText() -> UIImage {
        let font = UIFont(name: weight.fontName, size: size * 3)
            ?? UIFont(name: "Caveat", size: size * 3)
            ?? UIFont.systemFont(ofSize: size * 3)

        let nsText = text as NSString
        let attrs: [NSAttributedString.Key: Any] = [.font: font]
        let textSize = nsText.size(withAttributes: attrs)

        let padding: CGFloat = size * 0.5
        let canvasSize = CGSize(
            width: textSize.width + padding * 2,
            height: textSize.height + padding * 2
        )

        let renderer = UIGraphicsImageRenderer(size: canvasSize)
        let image = renderer.image { _ in
            nsText.draw(at: CGPoint(x: padding, y: padding), withAttributes: attrs)
        }

        let targetHeight = size * 1.3
        let scaleFactor = targetHeight / canvasSize.height
        let targetSize = CGSize(
            width: canvasSize.width * scaleFactor,
            height: targetHeight
        )

        let resizeRenderer = UIGraphicsImageRenderer(size: targetSize)
        return resizeRenderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
    }
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = ((int >> 24) & 0xFF, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
