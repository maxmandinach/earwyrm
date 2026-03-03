import Foundation
import StoreKit
import Supabase

@Observable @MainActor
final class SubscriptionManager {
    private(set) var products: [Product] = []
    private(set) var isPlus = false
    private(set) var isLoading = false
    private(set) var error: String?

    private nonisolated(unsafe) var updateListenerTask: Task<Void, Never>?

    static let monthlyId = "earwyrmplus_monthly"
    static let yearlyId = "earwyrmplus_yearly"
    private static let productIds: Set<String> = [monthlyId, yearlyId]

    // Tip jar
    static let tipSmallId = "earwyrm_tip_small"
    static let tipMediumId = "earwyrm_tip_medium"
    static let tipLargeId = "earwyrm_tip_large"
    private static let tipIds: Set<String> = [tipSmallId, tipMediumId, tipLargeId]
    private(set) var tipProducts: [Product] = []

    // MARK: - Business Rules

    private static let freeCollectionLimit = 3
    private static let freeMemoryLaneDays = 30

    func canCreateCollection(currentCount: Int) -> Bool {
        isPlus || currentCount < Self.freeCollectionLimit
    }

    var memoryLaneCutoffDate: Date? {
        isPlus ? nil : Calendar.current.date(byAdding: .day, value: -Self.freeMemoryLaneDays, to: .now)
    }

    // MARK: - Sorted Products

    var monthlyProduct: Product? {
        products.first { $0.id == Self.monthlyId }
    }

    var yearlyProduct: Product? {
        products.first { $0.id == Self.yearlyId }
    }

    // MARK: - Lifecycle

    init() {
        updateListenerTask = listenForTransactions()
        Task {
            await loadProducts()
            await checkEntitlements()
        }
    }

    deinit {
        updateListenerTask?.cancel()
    }

    // MARK: - Products

    func loadProducts() async {
        do {
            let allIds = Self.productIds.union(Self.tipIds)
            let allProducts = try await Product.products(for: allIds)

            products = allProducts
                .filter { Self.productIds.contains($0.id) }
                .sorted { $0.price < $1.price }

            tipProducts = allProducts
                .filter { Self.tipIds.contains($0.id) }
                .sorted { $0.price < $1.price }
        } catch {
            print("Failed to load products: \(error)")
        }
    }

    // MARK: - Purchase

    func purchase(_ product: Product) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try Self.checkVerified(verification)
            isPlus = true
            await syncToSupabase(productId: product.id, expiresAt: transaction.expirationDate)
            await transaction.finish()
        case .userCancelled:
            break
        case .pending:
            break
        @unknown default:
            break
        }
    }

    // MARK: - Tip Jar

    func purchaseTip(_ product: Product) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try Self.checkVerified(verification)
            Analytics.track(.tipPurchased, ["amount": product.displayPrice, "product": product.id])
            await transaction.finish()
        case .userCancelled:
            break
        case .pending:
            break
        @unknown default:
            break
        }
    }

    // MARK: - Restore

    func restorePurchases() async {
        isLoading = true
        defer { isLoading = false }
        try? await AppStore.sync()
        await checkEntitlements()
    }

    // MARK: - Entitlements

    func checkEntitlements() async {
        var foundPlus = false
        for await result in Transaction.currentEntitlements {
            if let transaction = try? Self.checkVerified(result),
               Self.productIds.contains(transaction.productID) {
                foundPlus = true
            }
        }
        let wasPlus = isPlus
        isPlus = foundPlus
        if wasPlus && !foundPlus {
            await syncToSupabase(productId: nil, expiresAt: nil)
        }
    }

    // MARK: - Transaction Listener

    private func listenForTransactions() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await result in Transaction.updates {
                if let transaction = try? Self.checkVerified(result) {
                    await MainActor.run {
                        self?.isPlus = true
                    }
                    await self?.syncToSupabase(
                        productId: transaction.productID,
                        expiresAt: transaction.expirationDate
                    )
                    await transaction.finish()
                }
            }
        }
    }

    // MARK: - Verification

    private nonisolated static func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let value):
            return value
        }
    }

    // MARK: - Supabase Sync

    private func syncToSupabase(productId: String?, expiresAt: Date?) async {
        guard let userId = try? await supabase.auth.session.user.id else { return }

        struct SubscriptionUpdate: Encodable {
            let subscriptionTier: String
            let subscriptionExpiresAt: Date?
            let subscriptionProductId: String?
            let subscriptionPlatform: String

            enum CodingKeys: String, CodingKey {
                case subscriptionTier = "subscription_tier"
                case subscriptionExpiresAt = "subscription_expires_at"
                case subscriptionProductId = "subscription_product_id"
                case subscriptionPlatform = "subscription_platform"
            }
        }

        let update = SubscriptionUpdate(
            subscriptionTier: isPlus ? "plus" : "free",
            subscriptionExpiresAt: expiresAt,
            subscriptionProductId: productId,
            subscriptionPlatform: "ios"
        )

        do {
            try await supabase
                .from("profiles")
                .update(update)
                .eq("id", value: userId.uuidString)
                .execute()
        } catch {
            print("Subscription sync error: \(error)")
        }
    }
}
