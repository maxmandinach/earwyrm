import SwiftUI

enum Theme {
    // MARK: - Colors (Light)
    enum Light {
        static let background = Color(hex: "#FAF8F5")
        static let card = Color(hex: "#F5F2ED")
        static let text = Color(hex: "#2C2825")
        static let secondary = Color(hex: "#6B635A")
        static let muted = Color(hex: "#9C948A")
        static let accent = Color(hex: "#B8A99A")
        static let divider = Color(hex: "#EBE4D8")
    }

    // MARK: - Colors (Dark)
    enum Dark {
        static let background = Color(hex: "#252220")
        static let card = Color(hex: "#2D2A27")
        static let text = Color(hex: "#FAF8F5")
        static let secondary = Color(hex: "#C8C0B5")
        static let muted = Color(hex: "#9C948A")
        static let accent = Color(hex: "#C8B8A8")
        static let divider = Color(hex: "#4A4540")
    }

    // MARK: - Adaptive Colors
    static let background = Color("background")
    static let card = Color("card")
    static let textPrimary = Color("textPrimary")
    static let textSecondary = Color("textSecondary")
    static let textMuted = Color("textMuted")
    static let accent = Color("accent")
    static let dividerColor = Color("dividerColor")

    // MARK: - Typography
    static func caveat(_ size: CGFloat = 28, weight: Font.Weight = .medium) -> Font {
        .custom("Caveat", size: size).weight(weight)
    }

    static func dmSans(_ size: CGFloat = 15, weight: Font.Weight = .regular) -> Font {
        .custom("DM Sans", size: size).weight(weight)
    }

    static func dmSansItalic(_ size: CGFloat = 15) -> Font {
        .custom("DM Sans", size: size).italic()
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
