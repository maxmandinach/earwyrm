import SwiftUI

struct ActivityInsightsCard: View {
    let viewModel: ActivityInsightsViewModel
    var onTapMemory: ((Lyric) -> Void)?

    var body: some View {
        if viewModel.hasAnythingToShow {
            VStack(alignment: .leading, spacing: Theme.Spacing.md) {
                // Your Week stats
                if viewModel.lyricsThisWeek > 0 || viewModel.resonancesThisWeek > 0 {
                    yourWeekSection
                }

                // On This Day memory
                if let lyric = viewModel.onThisDayLyric, let label = viewModel.onThisDayLabel {
                    if viewModel.lyricsThisWeek > 0 || viewModel.resonancesThisWeek > 0 {
                        Divider()
                            .foregroundStyle(Theme.dividerColor)
                    }
                    onThisDaySection(lyric: lyric, label: label)
                }
            }
            .padding(Theme.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
            .padding(.horizontal, Theme.Spacing.md)
        }
    }

    // MARK: - Your Week

    private var yourWeekSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            CaveatText(text: "your week", size: 22, color: Theme.textSecondary)

            HStack(spacing: Theme.Spacing.sm) {
                if viewModel.lyricsThisWeek > 0 {
                    statPill(
                        icon: "music.note",
                        value: "\(viewModel.lyricsThisWeek)",
                        label: viewModel.lyricsThisWeek == 1 ? "lyric" : "lyrics"
                    )
                }
                if viewModel.resonancesThisWeek > 0 {
                    statPill(
                        icon: "waveform.path",
                        value: "\(viewModel.resonancesThisWeek)",
                        label: viewModel.resonancesThisWeek == 1 ? "resonance" : "resonances"
                    )
                }
            }
        }
    }

    private func statPill(icon: String, value: String, label: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Theme.accent)
            Text("\(value) \(label)")
                .font(Theme.dmSans(13, weight: .medium))
                .foregroundStyle(Theme.textPrimary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Theme.accent.opacity(0.12))
        .clipShape(Capsule())
    }

    // MARK: - On This Day

    private func onThisDaySection(lyric: Lyric, label: String) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            CaveatText(text: "on this day", size: 22, color: Theme.textSecondary)

            Button {
                onTapMemory?(lyric)
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text(label)
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textMuted)

                    Text("\u{201C}\(lyric.content)\u{201D}")
                        .font(Theme.caveat(20))
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let display = [lyric.songTitle, lyric.artistName].compactMap({ $0 }).nilIfEmpty?.joined(separator: " \u{2014} ") {
                        Text(display)
                            .font(Theme.dmSansItalic(12))
                            .foregroundStyle(Theme.textSecondary)
                            .lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
        }
    }
}

// Small helper to avoid showing song line when both are nil
private extension Array {
    var nilIfEmpty: Self? {
        isEmpty ? nil : self
    }
}
