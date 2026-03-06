import SwiftUI
import StoreKit

struct EarwyrmPlusPaywall: View {
    var context: String? = nil
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(\.dismiss) private var dismiss
    @State private var purchaseError: String?
    @State private var showWelcome = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background
                    .ignoresSafeArea()

                if showWelcome {
                    welcomeView
                        .transition(.opacity)
                } else {
                    purchaseView
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: showWelcome)
            .toolbar {
                if !showWelcome {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Not now") {
                            Analytics.track(.paywallDismissed)
                            dismiss()
                        }
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.textMuted)
                    }
                }
            }
        }
        .onAppear { Analytics.track(.paywallShown) }
        .onChange(of: subscriptionManager.isPlus) { _, newValue in
            if newValue {
                withAnimation { showWelcome = true }
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    dismiss()
                }
            }
        }
        .interactiveDismissDisabled(subscriptionManager.isLoading || showWelcome)
    }

    // MARK: - Welcome View

    private var welcomeView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(Theme.accent)

            CaveatText(text: "welcome to earwyrm+", size: 36, weight: .bold, color: Theme.textPrimary)

            Text("you're all set")
                .font(Theme.dmSans(16))
                .foregroundStyle(Theme.textSecondary)

            Spacer()
        }
    }

    // MARK: - Purchase View

    private var purchaseView: some View {
        ScrollView {
            VStack(spacing: Theme.Spacing.md) {
                Spacer().frame(height: Theme.Spacing.md)

                // Header
                CaveatText(text: "earwyrm+", size: 42, weight: .bold, color: Theme.accent)

                Text("support earwyrm & unlock everything")
                    .font(Theme.dmSans(16))
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)

                if context == "ai_art" {
                    Text("You've used your free artwork")
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.textMuted)
                }

                // Feature rows
                VStack(spacing: 10) {
                    featureRow(
                        icon: "wand.and.stars",
                        title: "AI-generated lyric art",
                        subtitle: "100 generations per month"
                    )
                    featureRow(
                        icon: "square.stack.3d.up",
                        title: "Custom collections",
                        subtitle: "Free tier includes favorites only"
                    )
                    featureRow(
                        badgeIcon: true,
                        title: "Plus badge on your profile",
                        subtitle: "Show your support everywhere"
                    )
                }
                .padding(.horizontal, Theme.Spacing.lg)

                // Purchase buttons
                VStack(spacing: Theme.Spacing.sm) {
                    if let monthly = subscriptionManager.monthlyProduct {
                        purchaseButton(product: monthly, highlight: false)
                    }
                    if let yearly = subscriptionManager.yearlyProduct {
                        purchaseButton(product: yearly, highlight: true)
                    }

                    if subscriptionManager.products.isEmpty {
                        if let error = subscriptionManager.error {
                            Text(error)
                                .font(Theme.dmSans(13))
                                .foregroundStyle(Theme.textMuted)
                                .multilineTextAlignment(.center)
                        } else {
                            ProgressView()
                                .tint(Theme.accent)
                        }
                    }
                }
                .padding(.horizontal, Theme.Spacing.lg)

                if let error = purchaseError {
                    Text(error)
                        .font(Theme.dmSans(13))
                        .foregroundStyle(.red.opacity(0.8))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Theme.Spacing.lg)
                }

                // Restore
                Button {
                    Analytics.track(.paywallRestoreTapped)
                    Task { await subscriptionManager.restorePurchases() }
                } label: {
                    Text("Restore Purchases")
                        .font(Theme.dmSans(14))
                        .foregroundStyle(Theme.accent)
                }

                // Legal
                HStack(spacing: 12) {
                    Link("Terms of Use", destination: URL(string: "https://earwyrm.app/terms")!)
                    Text("·").foregroundStyle(Theme.textMuted)
                    Link("Privacy Policy", destination: URL(string: "https://earwyrm.app/privacy")!)
                }
                .font(Theme.dmSans(12))
                .foregroundStyle(Theme.textMuted)
                .padding(.top, Theme.Spacing.xs)
                .padding(.bottom, Theme.Spacing.md)
            }
        }
    }

    // MARK: - Feature Row

    private func featureRow(icon: String? = nil, badgeIcon: Bool = false, title: String, subtitle: String) -> some View {
        HStack(spacing: 14) {
            if badgeIcon {
                PlusBadge(size: 18)
                    .frame(width: 36)
            } else if let icon {
                Image(systemName: icon)
                    .font(.system(size: 22))
                    .foregroundStyle(Theme.accent)
                    .frame(width: 36)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Theme.dmSans(15, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                Text(subtitle)
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.textMuted)
            }

            Spacer()
        }
        .padding(Theme.Spacing.md)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Purchase Button

    private func purchaseButton(product: Product, highlight: Bool) -> some View {
        Button {
            let name = product.id == SubscriptionManager.yearlyId ? "yearly" : "monthly"
            Analytics.track(.paywallProductTapped, ["product": name])
            Task {
                purchaseError = nil
                do {
                    try await subscriptionManager.purchase(product)
                } catch {
                    purchaseError = error.localizedDescription
                }
            }
        } label: {
            VStack(spacing: 2) {
                HStack {
                    Text(product.id == SubscriptionManager.yearlyId ? "Yearly" : "Monthly")
                        .font(Theme.dmSans(16, weight: .semibold))
                    if product.id == SubscriptionManager.yearlyId {
                        Text("save 30%")
                            .font(Theme.dmSans(12, weight: .medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Theme.accent.opacity(0.2))
                            .clipShape(Capsule())
                    }
                    Spacer()
                    Text(product.displayPrice)
                        .font(Theme.dmSans(16, weight: .semibold))
                }
                HStack {
                    Text(product.id == SubscriptionManager.yearlyId ? "per year" : "per month")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(highlight ? .white.opacity(0.7) : Theme.textMuted)
                    Spacer()
                }
            }
            .padding(Theme.Spacing.md)
            .foregroundStyle(highlight ? .white : Theme.textPrimary)
            .background(highlight ? Theme.accent : Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(highlight ? Color.clear : Theme.dividerColor, lineWidth: 1)
            )
        }
        .disabled(subscriptionManager.isLoading)
        .opacity(subscriptionManager.isLoading ? 0.6 : 1)
    }
}
