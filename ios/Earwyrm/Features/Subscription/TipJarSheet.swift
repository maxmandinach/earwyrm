import SwiftUI
import StoreKit

struct TipJarSheet: View {
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(\.dismiss) private var dismiss
    @State private var purchaseError: String?
    @State private var showThankYou = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background
                    .ignoresSafeArea()

                if showThankYou {
                    thankYouView
                        .transition(.opacity)
                } else {
                    tipOptionsView
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: showThankYou)
            .toolbar {
                if !showThankYou {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Done") {
                            dismiss()
                        }
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.textMuted)
                    }
                }
            }
        }
        .interactiveDismissDisabled(subscriptionManager.isLoading || showThankYou)
    }

    // MARK: - Thank You

    private var thankYouView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Spacer()

            Image(systemName: "heart.fill")
                .font(.system(size: 56))
                .foregroundStyle(Theme.accent)

            CaveatText(text: "thank you", size: 36, weight: .bold, color: Theme.textPrimary)

            Text("your support means the world")
                .font(Theme.dmSans(16))
                .foregroundStyle(Theme.textSecondary)

            Spacer()
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                dismiss()
            }
        }
    }

    // MARK: - Tip Options

    private var tipOptionsView: some View {
        ScrollView {
            VStack(spacing: Theme.Spacing.lg) {
                Spacer().frame(height: Theme.Spacing.xl)

                CaveatText(text: "support earwyrm", size: 36, weight: .bold, color: Theme.accent)

                Text("earwyrm is indie-built. tips help keep it alive.")
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.Spacing.lg)

                Spacer().frame(height: Theme.Spacing.md)

                VStack(spacing: Theme.Spacing.sm) {
                    ForEach(subscriptionManager.tipProducts, id: \.id) { product in
                        tipButton(product: product)
                    }

                    if subscriptionManager.tipProducts.isEmpty {
                        Text("Loading...")
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

                Spacer().frame(height: Theme.Spacing.xl)
            }
        }
    }

    // MARK: - Tip Button

    private func tipButton(product: Product) -> some View {
        Button {
            Task {
                purchaseError = nil
                do {
                    try await subscriptionManager.purchaseTip(product)
                    withAnimation { showThankYou = true }
                } catch {
                    purchaseError = error.localizedDescription
                }
            }
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(product.displayName)
                        .font(Theme.dmSans(16, weight: .medium))
                    Text(tipSubtext(for: product.id))
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textMuted)
                }
                Spacer()
                Text(product.displayPrice)
                    .font(Theme.dmSans(16, weight: .semibold))
            }
            .padding(Theme.Spacing.md)
            .foregroundStyle(Theme.textPrimary)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Theme.dividerColor, lineWidth: 1)
            )
        }
        .disabled(subscriptionManager.isLoading)
        .opacity(subscriptionManager.isLoading ? 0.6 : 1)
    }

    private func tipSubtext(for productId: String) -> String {
        switch productId {
        case SubscriptionManager.tipSmallId: return "a kind gesture"
        case SubscriptionManager.tipMediumId: return "seriously generous"
        case SubscriptionManager.tipLargeId: return "above and beyond"
        default: return "thank you"
        }
    }
}
