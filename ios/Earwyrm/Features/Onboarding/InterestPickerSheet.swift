import SwiftUI

struct InterestPickerSheet: View {
    @Environment(FollowManager.self) private var followManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage("hasSeenInterestPicker") private var hasSeenInterestPicker = false

    @State private var step = 1
    @State private var selectedGenres: Set<String> = []

    private var followCount: Int {
        followManager.follows.count
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background
                    .ignoresSafeArea()

                Group {
                    if step == 1 {
                        genreStep
                            .transition(.move(edge: .leading).combined(with: .opacity))
                    } else {
                        artistStep
                            .transition(.move(edge: .trailing).combined(with: .opacity))
                    }
                }
                .animation(.easeInOut(duration: 0.3), value: step)
            }
            .toolbar {
                if step == 2 {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            withAnimation { step = 1 }
                            Haptics.light()
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 12, weight: .medium))
                                Text("Back")
                            }
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.textMuted)
                        }
                    }
                }

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

    // MARK: - Step 1: Genre Picker

    private var genreStep: some View {
        VStack(spacing: 0) {
            VStack(spacing: Theme.Spacing.xs) {
                Text("what do you listen to?")
                    .font(Theme.caveat(28))
                    .foregroundStyle(Theme.textPrimary)

                Text("pick your favorite genres")
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.textSecondary)
            }
            .padding(.top, Theme.Spacing.md)
            .padding(.bottom, Theme.Spacing.xl)

            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 90), spacing: Theme.Spacing.sm)],
                spacing: Theme.Spacing.sm
            ) {
                ForEach(FollowDiscoveryView.allGenres, id: \.self) { genre in
                    genreChip(genre)
                }
            }
            .padding(.horizontal, Theme.Spacing.lg)

            Spacer()
        }
    }

    private func genreChip(_ genre: String) -> some View {
        let isSelected = selectedGenres.contains(genre)

        return Button {
            if isSelected {
                selectedGenres.remove(genre)
            } else {
                selectedGenres.insert(genre)
                Haptics.light()
                // Auto-advance to step 2 after a brief moment
                Task {
                    try? await Task.sleep(for: .milliseconds(400))
                    withAnimation { step = 2 }
                }
            }
        } label: {
            Text(genre)
                .font(Theme.dmSans(14, weight: .medium))
                .foregroundStyle(isSelected ? .white : Theme.textPrimary)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(isSelected ? Theme.accent : Color.clear)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(
                            isSelected ? Color.clear : Theme.textPrimary.opacity(0.15),
                            lineWidth: 1
                        )
                )
        }
    }

    // MARK: - Step 2: Artist List

    private var artistStep: some View {
        VStack(spacing: 0) {
            VStack(spacing: Theme.Spacing.xs) {
                Text("follow some artists")
                    .font(Theme.caveat(28))
                    .foregroundStyle(Theme.textPrimary)

                // Show selected genres as reminder chips
                HStack(spacing: 6) {
                    ForEach(Array(selectedGenres).sorted(), id: \.self) { genre in
                        Text(genre)
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.textSecondary)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(
                                Capsule()
                                    .fill(Theme.card)
                            )
                    }
                }
            }
            .padding(.top, Theme.Spacing.md)
            .padding(.bottom, Theme.Spacing.lg)

            // Follow count pill
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
                    .padding(.bottom, Theme.Spacing.sm)
            }

            ScrollView {
                FollowDiscoveryView(genreFilter: selectedGenres)
                    .padding(.bottom, Theme.Spacing.xl)
            }

            Spacer(minLength: 0)
        }
    }

    private func complete() {
        hasSeenInterestPicker = true
        Analytics.track(.interestPickerCompleted, ["follow_count": "\(followCount)"])
        Haptics.light()
        dismiss()
    }
}
