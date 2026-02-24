import SwiftUI

struct ReportSheet: View {
    let contentType: String  // "lyric" or "comment"
    let contentId: UUID

    @Environment(AuthManager.self) private var auth
    @Environment(BlockManager.self) private var blockManager
    @Environment(\.dismiss) private var dismiss

    @State private var selectedReason: String?
    @State private var isSubmitting = false
    @State private var submitted = false

    private let reasons = [
        "Spam",
        "Harassment",
        "Inappropriate content",
        "Other"
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: Theme.Spacing.lg) {
                // Header
                VStack(spacing: Theme.Spacing.sm) {
                    Image(systemName: "flag")
                        .font(.system(size: 28))
                        .foregroundStyle(Theme.textSecondary)

                    Text("Report \(contentType)")
                        .font(Theme.dmSans(18, weight: .medium))
                        .foregroundStyle(Theme.textPrimary)

                    Text("Why are you reporting this?")
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.textMuted)
                }
                .padding(.top, Theme.Spacing.lg)

                // Reason picker
                VStack(spacing: Theme.Spacing.sm) {
                    ForEach(reasons, id: \.self) { reason in
                        Button {
                            selectedReason = reason
                            Haptics.selection()
                        } label: {
                            HStack {
                                Text(reason)
                                    .font(Theme.dmSans(15))
                                    .foregroundStyle(Theme.textPrimary)

                                Spacer()

                                if selectedReason == reason {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 18))
                                        .foregroundStyle(Theme.accent)
                                } else {
                                    Circle()
                                        .strokeBorder(Theme.textMuted.opacity(0.3), lineWidth: 1.5)
                                        .frame(width: 18, height: 18)
                                }
                            }
                            .padding(Theme.Spacing.md)
                            .background(
                                selectedReason == reason
                                    ? Theme.accent.opacity(0.08)
                                    : Theme.card
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
                .padding(.horizontal, Theme.Spacing.lg)

                Spacer()

                // Submit button
                if submitted {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("Report submitted")
                            .font(Theme.dmSans(15, weight: .medium))
                            .foregroundStyle(Theme.textPrimary)
                    }
                    .padding(.bottom, Theme.Spacing.xl)
                } else {
                    Button {
                        Task { await submit() }
                    } label: {
                        Text(isSubmitting ? "Submitting..." : "Report")
                            .font(Theme.dmSans(16, weight: .medium))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Theme.Spacing.md)
                            .background(
                                selectedReason != nil
                                    ? Color(hex: "#D4756A")
                                    : Theme.textMuted.opacity(0.3)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(selectedReason == nil || isSubmitting)
                    .padding(.horizontal, Theme.Spacing.lg)
                    .padding(.bottom, Theme.Spacing.lg)
                }
            }
            .background(Theme.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
    }

    private func submit() async {
        guard let reason = selectedReason,
              let userId = auth.userId else { return }

        isSubmitting = true
        let success = await blockManager.reportContent(
            reporterId: userId,
            contentType: contentType,
            contentId: contentId,
            reason: reason
        )

        if success {
            submitted = true
            try? await Task.sleep(for: .seconds(1))
            dismiss()
        }
        isSubmitting = false
    }
}
