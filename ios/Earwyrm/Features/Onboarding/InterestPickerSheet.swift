import SwiftUI

struct InterestPickerSheet: View {
    @Environment(FollowManager.self) private var followManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage("hasSeenInterestPicker") private var hasSeenInterestPicker = false
    let viewModel: ExploreViewModel

    private var followCount: Int {
        followManager.follows.count
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    VStack(spacing: Theme.Spacing.xs) {
                        Text("who do you listen to?")
                            .font(Theme.caveat(28))
                            .foregroundStyle(Theme.textPrimary)

                        Text("follow artists to build your feed")
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.textSecondary)
                    }
                    .padding(.top, Theme.Spacing.md)
                    .padding(.bottom, Theme.Spacing.lg)

                    // Discovery content
                    ScrollView {
                        FollowDiscoveryView(viewModel: viewModel)
                            .padding(.bottom, 100)
                    }

                    Spacer(minLength: 0)
                }

                // Bottom bar
                VStack {
                    Spacer()
                    bottomBar
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Skip") {
                        complete()
                    }
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.textMuted)
                }
            }
        }
    }

    // MARK: - Bottom Bar

    private var bottomBar: some View {
        VStack(spacing: Theme.Spacing.sm) {
            if followCount > 0 {
                Text("\(followCount) followed")
                    .font(Theme.dmSans(13, weight: .medium))
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(
                        Capsule()
                            .fill(Theme.card)
                    )
            }

            Button {
                complete()
            } label: {
                Text("Continue")
                    .font(Theme.dmSans(16, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Theme.accent)
                    )
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.bottom, Theme.Spacing.md)
        .background(
            LinearGradient(
                colors: [Theme.background.opacity(0), Theme.background],
                startPoint: .top,
                endPoint: .center
            )
            .frame(height: 40)
            .allowsHitTesting(false),
            alignment: .top
        )
    }

    private func complete() {
        hasSeenInterestPicker = true
        Analytics.track(.interestPickerCompleted, ["follow_count": "\(followCount)"])
        Haptics.light()
        dismiss()
    }
}
