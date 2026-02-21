import SwiftUI

struct LyricCardView: View {
    let lyric: Lyric
    var hero: Bool = true
    var showActions: Bool = false
    var isPublic: Bool = false
    var isOwn: Bool = true
    var onShare: (() -> Void)?
    var onReplace: (() -> Void)?
    var onEdit: (() -> Void)?
    var onVisibilityChange: ((Bool) -> Void)?

    // Resonate state
    var hasReacted: Bool = false
    var reactionCount: Int = 0
    var isResonateAnimating: Bool = false
    var onResonate: (() -> Void)?

    // Comment state
    var commentCount: Int = 0
    var showComments: Bool = false
    var onToggleComments: (() -> Void)?

    // For comment section
    var currentUserId: UUID?

    // Note (optional — only on hero/own card)
    var note: LyricNote?
    var onTapNote: (() -> Void)?

    var body: some View {
        VStack(spacing: 0) {
            // Card
            VStack(alignment: .center, spacing: 0) {
                // Lyric content — centered blockquote style
                Text(lyric.content)
                    .font(Theme.caveat(hero ? 30 : 26, weight: .medium))
                    .foregroundStyle(Theme.Light.text)
                    .lineSpacing(hero ? 12 : 8)
                    .tracking(hero ? 0.3 : 0)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.bottom, hero ? Theme.Spacing.lg : Theme.Spacing.md)

                // Signature: thin accent rule + metadata
                if lyric.songTitle != nil || lyric.artistName != nil {
                    Rectangle()
                        .fill(Theme.Light.accent.opacity(0.5))
                        .frame(width: 80, height: 1.5)
                        .padding(.top, hero ? Theme.Spacing.md : Theme.Spacing.sm)
                        .padding(.bottom, hero ? Theme.Spacing.lg : Theme.Spacing.md)

                    HStack(spacing: 12) {
                        // Cover art thumbnail
                        if let coverUrl = lyric.coverArtUrl,
                           let url = URL(string: coverUrl) {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                RoundedRectangle(cornerRadius: hero ? 6 : 4)
                                    .fill(Theme.Light.divider)
                            }
                            .frame(width: hero ? 56 : 40, height: hero ? 56 : 40)
                            .clipShape(RoundedRectangle(cornerRadius: hero ? 6 : 4))
                            .shadow(color: .black.opacity(0.15), radius: 3, y: 1)
                        }

                        songArtistLabel
                    }
                }

                // Tags
                if let tags = lyric.tags, !tags.isEmpty {
                    HStack(spacing: 8) {
                        ForEach(tags, id: \.self) { tag in
                            Text("#\(tag)")
                                .font(Theme.dmSans(12))
                                .foregroundStyle(Theme.Light.secondary)
                                .opacity(0.5)
                        }
                    }
                    .padding(.top, Theme.Spacing.md)
                }

                // Timestamp
                if let createdAt = formattedDate {
                    Text(createdAt)
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.Light.muted)
                        .opacity(0.4)
                        .padding(.top, hero ? Theme.Spacing.lg : Theme.Spacing.md)
                }

                // Note — inline on card
                if let note, hero {
                    Button {
                        onTapNote?()
                    } label: {
                        HStack(alignment: .top, spacing: Theme.Spacing.sm) {
                            Rectangle()
                                .fill(Theme.Light.accent.opacity(0.3))
                                .frame(width: 2)

                            Text(note.content)
                                .font(Theme.caveat(18))
                                .foregroundStyle(Theme.Light.secondary)
                                .lineLimit(3)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .fixedSize(horizontal: false, vertical: true)
                    }
                    .buttonStyle(.plain)
                    .padding(.top, Theme.Spacing.md)
                }

                // Action bar
                if showActions,
                   let onShare, let onReplace, let onEdit,
                   let onVisibilityChange, let onToggleComments, let onResonate {
                    CardActionBar(
                        lyric: lyric,
                        isPublic: isPublic,
                        isOwn: isOwn,
                        onShare: onShare,
                        onReplace: onReplace,
                        onEdit: onEdit,
                        onVisibilityChange: onVisibilityChange,
                        onToggleComments: onToggleComments,
                        hasReacted: hasReacted,
                        reactionCount: reactionCount,
                        isResonateAnimating: isResonateAnimating,
                        onResonate: onResonate,
                        commentCount: commentCount
                    )
                }
            }
            .padding(hero ? Theme.Spacing.xl + Theme.Spacing.sm : Theme.Spacing.lg)
            .frame(maxWidth: .infinity)
            .background(Theme.Light.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            // Hero: deeper shadow with more presence
            .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
            .shadow(color: .black.opacity(hero ? 0.1 : 0.08), radius: hero ? 24 : 12, y: hero ? 8 : 4)

            // Comment section — below the card
            if showComments {
                CommentSectionView(
                    lyricId: lyric.id,
                    currentUserId: currentUserId,
                    initialCount: commentCount
                )
                .padding(.horizontal, Theme.Spacing.md)
                .padding(.top, Theme.Spacing.sm)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.easeInOut(duration: 0.25), value: showComments)
    }

    @ViewBuilder
    private var songArtistLabel: some View {
        let parts = [lyric.songTitle, lyric.artistName].compactMap { $0 }
        if !parts.isEmpty {
            Text(parts.joined(separator: " — "))
                .font(Theme.dmSansItalic(hero ? 15 : 14))
                .foregroundStyle(Theme.Light.secondary)
        }
    }

    private var formattedDate: String? {
        let now = Date()
        let interval = now.timeIntervalSince(lyric.createdAt)

        if interval < 60 {
            return "just now"
        } else if interval < 3600 {
            let mins = Int(interval / 60)
            return "\(mins)m ago"
        } else if interval < 86400 {
            let hours = Int(interval / 3600)
            return "\(hours)h ago"
        } else if interval < 604800 {
            let days = Int(interval / 86400)
            return "\(days)d ago"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d, yyyy"
            return formatter.string(from: lyric.createdAt)
        }
    }
}
