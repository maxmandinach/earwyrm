import SwiftUI

/// Unified sheet for art generation with two modes: first gen (free) and regen (Plus).
struct ArtGenerationSheet: View {
    enum Mode {
        case firstGen
        case regen
    }

    let mode: Mode
    let existingNote: String?
    let artRemaining: Int?
    var onGenerate: (_ note: String?, _ refinement: String?) -> Void
    var onShowPaywall: () -> Void

    @State private var inlineNote = ""
    @State private var regenNote = ""
    @State private var regenArtDirection = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        switch mode {
        case .firstGen:
            firstGenContent
        case .regen:
            regenContent
        }
    }

    // MARK: - First Gen (Free User)

    private var firstGenContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Create Your Artwork")
                .font(Theme.dmSans(20, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity)

            if existingNote == nil {
                VStack(alignment: .leading, spacing: 5) {
                    Text("add a personal note (optional)")
                        .font(Theme.dmSans(14, weight: .medium))
                        .foregroundStyle(Theme.textPrimary)

                    Text("saves to lyric card \u{00B7} private by default \u{00B7} shapes your artwork")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                }

                TextField("what does this lyric mean to you?", text: $inlineNote, axis: .vertical)
                    .font(Theme.noteFont(15))
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(2...4)
                    .padding(12)
                    .background(Theme.background)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Theme.dividerColor, lineWidth: 1)
                    )
            } else {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.accent)
                    Text("Your note will shape the artwork")
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.textSecondary)
                }
            }

            Button {
                let note = existingNote ?? {
                    let trimmed = inlineNote.trimmingCharacters(in: .whitespacesAndNewlines)
                    return trimmed.isEmpty ? nil : trimmed
                }()
                dismiss()
                onGenerate(note, nil)
            } label: {
                HStack(spacing: 8) {
                    Text("\u{2726}")
                        .font(.system(size: 12))
                    Text("Generate")
                        .font(Theme.dmSans(16, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            HStack(spacing: 0) {
                Spacer()
                Text("Your one free generation. ")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.textMuted)
                Button {
                    dismiss()
                    onShowPaywall()
                } label: {
                    Text("Get more with earwyrm+")
                        .font(Theme.dmSans(12, weight: .medium))
                        .foregroundStyle(Theme.accent)
                        .underline()
                }
                Spacer()
            }
        }
        .padding(.horizontal, Theme.Spacing.lg)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .background(Theme.background)
    }

    // MARK: - Regen (Plus User)

    private var regenContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Generate New Artwork")
                .font(Theme.dmSans(20, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 5) {
                Text("your note")
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
            }

            TextField("add a personal note (optional)", text: $regenNote, axis: .vertical)
                .font(Theme.noteFont(15))
                .foregroundStyle(Theme.textSecondary)
                .lineLimit(2...4)
                .padding(12)
                .background(Theme.background)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Theme.dividerColor, lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 5) {
                Text("art direction (optional)")
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
            }

            TextField("warmer colors, more abstract, add rain...", text: $regenArtDirection, axis: .vertical)
                .font(Theme.noteFont(15))
                .foregroundStyle(Theme.textSecondary)
                .lineLimit(1...3)
                .padding(12)
                .background(Theme.background)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Theme.dividerColor, lineWidth: 1)
                )

            Button {
                let trimmedDirection = regenArtDirection.trimmingCharacters(in: .whitespacesAndNewlines)
                let refinement = trimmedDirection.isEmpty ? nil : trimmedDirection
                let trimmedNote = regenNote.trimmingCharacters(in: .whitespacesAndNewlines)
                let note = trimmedNote.isEmpty ? nil : trimmedNote
                dismiss()
                onGenerate(note, refinement)
            } label: {
                HStack(spacing: 8) {
                    Text("\u{2726}").font(.system(size: 12))
                    Text("Generate").font(Theme.dmSans(16, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            if let remaining = artRemaining, remaining > 0 {
                Text("\(remaining) generations remaining this month")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.textMuted)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, Theme.Spacing.lg)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .background(Theme.background)
        .onAppear {
            regenNote = existingNote ?? ""
        }
    }
}
