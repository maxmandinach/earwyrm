import SwiftUI

/// Sheet for art generation — note entry + optional art direction (Plus).
struct ArtGenerationSheet: View {
    let isPlus: Bool
    let hasExistingArt: Bool
    let existingNote: String?
    let artRemaining: Int?
    var onGenerate: (_ note: String?, _ refinement: String?) -> Void
    var onShowPaywall: () -> Void

    @State private var noteText = ""
    @State private var artDirection = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(hasExistingArt ? "Generate New Artwork" : "Create Your Artwork")
                .font(Theme.dmSans(20, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity)

            // Note field
            VStack(alignment: .leading, spacing: 5) {
                Text("your note")
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)

                if existingNote == nil {
                    Text("what does this lyric mean to you? saves to your lyric card \u{00B7} private by default \u{00B7} shapes your artwork")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                }
            }

            TextField("what does this lyric mean to you?", text: $noteText, axis: .vertical)
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

            // Art direction — Plus only
            if isPlus {
                VStack(alignment: .leading, spacing: 5) {
                    Text("art direction (optional)")
                        .font(Theme.dmSans(14, weight: .medium))
                        .foregroundStyle(Theme.textPrimary)
                }

                TextField("warmer colors, more abstract, add rain...", text: $artDirection, axis: .vertical)
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
            }

            // Generate button
            Button {
                let trimmedNote = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
                let note = trimmedNote.isEmpty ? nil : trimmedNote
                let trimmedDirection = artDirection.trimmingCharacters(in: .whitespacesAndNewlines)
                let refinement = trimmedDirection.isEmpty ? nil : trimmedDirection
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

            // Footer
            if isPlus {
                if let remaining = artRemaining, remaining > 0 {
                    Text("\(remaining) generations remaining this month")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                        .frame(maxWidth: .infinity)
                }
            } else {
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
        }
        .padding(.horizontal, Theme.Spacing.lg)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .background(Theme.background)
        .onAppear {
            noteText = existingNote ?? ""
        }
    }
}
