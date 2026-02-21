import SwiftUI

struct CardActionBar: View {
    let lyric: Lyric
    let isPublic: Bool
    let isOwn: Bool
    let onShare: () -> Void
    let onReplace: () -> Void
    let onEdit: () -> Void
    let onVisibilityChange: (Bool) -> Void
    let onToggleComments: () -> Void

    // Resonate state — passed in from parent
    let hasReacted: Bool
    let reactionCount: Int
    let isResonateAnimating: Bool
    let onResonate: () -> Void

    let commentCount: Int

    @State private var shareNudge = false

    // Apple HIG: minimum 44pt touch targets
    private let touchHeight: CGFloat = 44
    private let touchMinWidth: CGFloat = 44

    var body: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Theme.Light.divider.opacity(0.6))
                .frame(height: 0.5)

            HStack(spacing: 0) {
                // Left group
                HStack(spacing: 0) {
                    // Resonate
                    resonateButton

                    // Comments
                    Button {
                        Haptics.light()
                        onToggleComments()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "bubble.left")
                                .font(.system(size: 14))
                            if commentCount > 0 {
                                Text("\(commentCount)")
                                    .font(Theme.dmSans(12))
                            }
                        }
                        .foregroundStyle(Theme.Light.muted)
                        .frame(minWidth: touchMinWidth, minHeight: touchHeight)
                    }

                    // Visibility — own lyric only
                    if isOwn {
                        Button {
                            Haptics.light()
                            onVisibilityChange(!isPublic)
                        } label: {
                            Image(systemName: isPublic ? "eye" : "eye.slash")
                                .font(.system(size: 14))
                                .foregroundStyle(isPublic ? Theme.Light.secondary : Theme.Light.muted)
                                .frame(minWidth: touchMinWidth, minHeight: touchHeight)
                        }
                    }
                }

                Spacer()

                // Right group
                HStack(spacing: 0) {
                    // Share
                    shareButton

                    // Pencil menu — edit or replace (own lyric only)
                    if isOwn {
                        Menu {
                            Button {
                                onEdit()
                            } label: {
                                Label("Edit lyric", systemImage: "square.and.pencil")
                            }
                            Button {
                                onReplace()
                            } label: {
                                Label("Replace lyric", systemImage: "arrow.triangle.swap")
                            }
                        } label: {
                            Image(systemName: "pencil")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.Light.muted)
                                .frame(minWidth: touchMinWidth, minHeight: touchHeight)
                        }
                    }
                }
            }
        }
        .padding(.top, Theme.Spacing.sm)
    }

    // MARK: - Resonate Button

    private var resonateButton: some View {
        Button {
            onResonate()
        } label: {
            HStack(spacing: 4) {
                ResonateIcon(
                    isActive: hasReacted,
                    isAnimating: isResonateAnimating,
                    size: 18
                )

                if reactionCount > 0 {
                    Text("\(reactionCount)")
                        .font(Theme.dmSans(12))
                }
            }
            .foregroundStyle(hasReacted ? Theme.Light.accent : Theme.Light.muted)
            .frame(minWidth: touchMinWidth, minHeight: touchHeight)
        }
    }

    // MARK: - Share Button

    private var shareButton: some View {
        Button {
            Haptics.medium()
            withAnimation(.spring(response: 0.2, dampingFraction: 0.6)) {
                shareNudge = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                shareNudge = false
            }
            onShare()
        } label: {
            Image(systemName: "square.and.arrow.up")
                .font(.system(size: 14))
                .foregroundStyle(Theme.Light.muted)
                .frame(minWidth: touchMinWidth, minHeight: touchHeight)
                .offset(y: shareNudge ? -2 : 0)
        }
    }
}
