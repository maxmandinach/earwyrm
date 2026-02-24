import SwiftUI
import StoreKit

struct EarwyrmPlusPaywall: View {
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
            VStack(spacing: Theme.Spacing.lg) {
                Spacer().frame(height: Theme.Spacing.xl)

                // Header
                CaveatText(text: "earwyrm+", size: 42, weight: .bold, color: Theme.accent)

                Text("support earwyrm & unlock everything")
                    .font(Theme.dmSans(16))
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)

                Spacer().frame(height: Theme.Spacing.sm)

                // Feature rows
                VStack(spacing: Theme.Spacing.md) {
                    featureRow(
                        icon: "square.stack.3d.up",
                        title: "Unlimited collections",
                        subtitle: "Free tier limited to 3"
                    )
                    featureRow(
                        icon: "clock.arrow.circlepath",
                        title: "Your complete memory lane",
                        subtitle: "Free tier limited to 30 days"
                    )
                }
                .padding(.horizontal, Theme.Spacing.lg)

                Spacer().frame(height: Theme.Spacing.md)

                // Purchase buttons
                VStack(spacing: Theme.Spacing.sm) {
                    if let monthly = subscriptionManager.monthlyProduct {
                        purchaseButton(product: monthly, highlight: false)
                    }
                    if let yearly = subscriptionManager.yearlyProduct {
                        purchaseButton(product: yearly, highlight: true)
                    }

                    if subscriptionManager.products.isEmpty {
                        Text("Products loading...")
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.textMuted)
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
                .padding(.top, Theme.Spacing.xs)

                Spacer().frame(height: Theme.Spacing.xl)
            }
        }
    }

    // MARK: - Feature Row

    private func featureRow(icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 22))
                .foregroundStyle(Theme.accent)
                .frame(width: 36)

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
