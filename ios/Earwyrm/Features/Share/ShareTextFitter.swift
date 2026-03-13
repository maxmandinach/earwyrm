import UIKit

// MARK: - Share Text Fitter

/// Pure measurement utility that determines font sizes and text truncation
/// for share card rendering. Uses NSAttributedString.boundingRect for
/// pixel-accurate sizing.
///
/// Lyrics render in Caveat (handwriting). Notes render in DM Sans italic.
enum ShareTextFitter {

    struct FitResult {
        let heroText: String
        let heroFontSize: CGFloat
        let secondaryText: String?
        let secondaryFontSize: CGFloat
    }

    enum TextKind {
        case lyric   // Caveat-Medium
        case note    // DM Sans italic
    }

    // MARK: - Constants

    private static let textWidth: CGFloat = 1080 - 240 // 840 (120px margins each side)

    // Chrome heights — top spacer + rule + attribution + label + bottom spacer + username + brand + bottom pad
    private static func chromeHeight(for format: ShareFormat) -> CGFloat {
        switch format {
        case .square: return 380
        case .story: return 780
        }
    }

    private static func minFont(for format: ShareFormat) -> CGFloat {
        switch format {
        case .square: return 36
        case .story: return 43
        }
    }

    private static func maxFont(for format: ShareFormat) -> CGFloat {
        switch format {
        case .square: return 80
        case .story: return 80
        }
    }

    private static let secondaryRatio: CGFloat = 0.45
    private static let interBlockSpacing: CGFloat = 70 // rule + gaps + label

    // MARK: - Public API

    static func fit(
        heroContent: String,
        secondaryContent: String?,
        format: ShareFormat
    ) -> FitResult {
        let availableHeight = format.size.height - chromeHeight(for: format)
        let minSize = minFont(for: format)
        let maxSize = maxFont(for: format)
        let secondary = secondaryContent?.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasSecondary = secondary != nil && !(secondary?.isEmpty ?? true)

        // Hero is always lyric (Caveat), secondary is always note (Cochin)
        let heroKind: TextKind = .lyric
        let secKind: TextKind = .note

        // Binary search for largest hero font where everything fits
        var lo = minSize
        var hi = maxSize
        var bestSize = minSize

        while lo <= hi {
            let mid = ((lo + hi) / 2).rounded(.down)
            let secRenderSize = max(mid * secondaryRatio, 18)

            let heroHeight = measureText(heroContent, fontSize: mid, kind: heroKind)
            var totalHeight = heroHeight

            if hasSecondary {
                let secHeight = measureText(secondary!, fontSize: secRenderSize, kind: secKind)
                totalHeight += interBlockSpacing + secHeight
            }

            if totalHeight <= availableHeight {
                bestSize = mid
                lo = mid + 1
            } else {
                hi = mid - 1
            }
        }

        let secondarySize = max(bestSize * secondaryRatio, 18)

        // Check if content fits at bestSize — if not, truncate
        let heroHeight = measureText(heroContent, fontSize: bestSize, kind: heroKind)
        var totalUsed = heroHeight

        if hasSecondary {
            let secHeight = measureText(secondary!, fontSize: secondarySize, kind: secKind)
            totalUsed += interBlockSpacing + secHeight
        }

        if totalUsed <= availableHeight {
            return FitResult(
                heroText: heroContent,
                heroFontSize: bestSize,
                secondaryText: hasSecondary ? secondary : nil,
                secondaryFontSize: secondarySize
            )
        }

        // Truncation cascade: secondary first, then hero
        if hasSecondary {
            let heroH = measureText(heroContent, fontSize: bestSize, kind: heroKind)
            let availableForSecondary = availableHeight - heroH - interBlockSpacing

            if availableForSecondary > 0 {
                let truncated = truncateToFit(
                    secondary!, fontSize: secondarySize, kind: secKind, maxHeight: availableForSecondary
                )
                return FitResult(
                    heroText: heroContent,
                    heroFontSize: bestSize,
                    secondaryText: truncated,
                    secondaryFontSize: secondarySize
                )
            } else {
                let truncatedHero = truncateToFit(
                    heroContent, fontSize: bestSize, kind: heroKind, maxHeight: availableHeight
                )
                return FitResult(
                    heroText: truncatedHero,
                    heroFontSize: bestSize,
                    secondaryText: nil,
                    secondaryFontSize: secondarySize
                )
            }
        } else {
            let truncatedHero = truncateToFit(
                heroContent, fontSize: bestSize, kind: heroKind, maxHeight: availableHeight
            )
            return FitResult(
                heroText: truncatedHero,
                heroFontSize: bestSize,
                secondaryText: nil,
                secondaryFontSize: secondarySize
            )
        }
    }

    // MARK: - Text Measurement

    private static func measureText(_ text: String, fontSize: CGFloat, kind: TextKind) -> CGFloat {
        let font: UIFont
        let lineSpacingRatio: CGFloat

        switch kind {
        case .lyric:
            font = UIFont(name: "Caveat-Medium", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize)
            lineSpacingRatio = 0.35
        case .note:
            font = UIFont(name: "Cochin", size: fontSize) ?? UIFont.systemFont(ofSize: fontSize)
            lineSpacingRatio = 0.4
        }

        let style = NSMutableParagraphStyle()
        style.lineSpacing = fontSize * lineSpacingRatio

        let attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .paragraphStyle: style
        ]

        let attributedString = NSAttributedString(string: text, attributes: attributes)
        let constraintSize = CGSize(width: textWidth, height: .greatestFiniteMagnitude)
        let boundingRect = attributedString.boundingRect(
            with: constraintSize,
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            context: nil
        )
        return ceil(boundingRect.height)
    }

    // MARK: - Truncation

    private static func truncateToFit(_ text: String, fontSize: CGFloat, kind: TextKind, maxHeight: CGFloat) -> String {
        if measureText(text, fontSize: fontSize, kind: kind) <= maxHeight {
            return text
        }

        let words = text.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
        var lo = 1
        var hi = words.count
        var bestCount = 1

        while lo <= hi {
            let mid = (lo + hi) / 2
            let candidate = words.prefix(mid).joined(separator: " ") + "..."
            if measureText(candidate, fontSize: fontSize, kind: kind) <= maxHeight {
                bestCount = mid
                lo = mid + 1
            } else {
                hi = mid - 1
            }
        }

        if bestCount >= words.count {
            return text
        }
        return words.prefix(bestCount).joined(separator: " ") + "..."
    }
}
