package com.earwyrm.app.core.subscription

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import com.earwyrm.app.core.auth.AuthManager
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class SubscriptionUpdate(
    @SerialName("subscription_tier") val subscriptionTier: String,
    @SerialName("subscription_expires_at") val subscriptionExpiresAt: String? = null,
    @SerialName("subscription_product_id") val subscriptionProductId: String? = null,
    @SerialName("subscription_platform") val subscriptionPlatform: String = "android"
)

@Serializable
data class TierRow(
    @SerialName("subscription_tier") val subscriptionTier: String? = null
)

data class ProductInfo(
    val productId: String,
    val title: String,
    val description: String,
    val formattedPrice: String,
    val priceMicros: Long,
    val billingPeriod: String, // P1M or P1Y
    internal val productDetails: ProductDetails,
    internal val offerToken: String
)

data class TipProductInfo(
    val productId: String,
    val title: String,
    val description: String,
    val formattedPrice: String,
    val priceMicros: Long,
    internal val productDetails: ProductDetails
)

@Singleton
class BillingManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val supabase: SupabaseClient,
    private val authManager: AuthManager
) : PurchasesUpdatedListener {

    companion object {
        private const val TAG = "BillingManager"
        // Match iOS product IDs exactly
        const val MONTHLY_PRODUCT_ID = "earwyrmplus_monthly"
        const val YEARLY_PRODUCT_ID = "earwyrmplus_yearly"
        private val SUBSCRIPTION_PRODUCT_IDS = listOf(MONTHLY_PRODUCT_ID, YEARLY_PRODUCT_ID)

        // Tip jar (consumable in-app products)
        const val TIP_SMALL_ID = "earwyrm_tip_small"
        const val TIP_MEDIUM_ID = "earwyrm_tip_medium"
        const val TIP_LARGE_ID = "earwyrm_tip_large"
        private val TIP_PRODUCT_IDS = listOf(TIP_SMALL_ID, TIP_MEDIUM_ID, TIP_LARGE_ID)
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val _isPlusSubscriber = MutableStateFlow(false)
    val isPlusSubscriber: StateFlow<Boolean> = _isPlusSubscriber.asStateFlow()

    private val _availableProducts = MutableStateFlow<List<ProductInfo>>(emptyList())
    val availableProducts: StateFlow<List<ProductInfo>> = _availableProducts.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _tipProducts = MutableStateFlow<List<TipProductInfo>>(emptyList())
    val tipProducts: StateFlow<List<TipProductInfo>> = _tipProducts.asStateFlow()

    private val _tipPurchaseSuccess = MutableStateFlow(false)
    val tipPurchaseSuccess: StateFlow<Boolean> = _tipPurchaseSuccess.asStateFlow()

    fun clearTipPurchaseSuccess() { _tipPurchaseSuccess.value = false }

    val monthlyProduct: ProductInfo? get() = _availableProducts.value.find { it.productId == MONTHLY_PRODUCT_ID }
    val yearlyProduct: ProductInfo? get() = _availableProducts.value.find { it.productId == YEARLY_PRODUCT_ID }

    private var billingClient: BillingClient? = null
    private var isServiceConnected = false

    // ── Initialization ──────────────────────────────────────────────────

    fun initialize() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()
        startConnection()
    }

    private fun startConnection() {
        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing service connected")
                    isServiceConnected = true
                    scope.launch {
                        queryProducts()
                        queryTipProducts()
                        restorePurchases()
                    }
                } else {
                    Log.e(TAG, "Billing setup failed: ${result.debugMessage}")
                    _error.value = "Could not connect to Google Play"
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected")
                isServiceConnected = false
                // Retry connection after a delay
                scope.launch {
                    delay(3000)
                    startConnection()
                }
            }
        })
    }

    // ── Query Products ──────────────────────────────────────────────────

    private suspend fun queryProducts() {
        val productList = SUBSCRIPTION_PRODUCT_IDS.map { id ->
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        }

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        val client = billingClient ?: return

        suspendCancellableCoroutine { continuation ->
            client.queryProductDetailsAsync(params) { billingResult, detailsList ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    val products = detailsList.mapNotNull { details ->
                        val offerDetails = details.subscriptionOfferDetails?.firstOrNull()
                            ?: return@mapNotNull null
                        val pricingPhase = offerDetails.pricingPhases.pricingPhaseList.firstOrNull()
                            ?: return@mapNotNull null

                        ProductInfo(
                            productId = details.productId,
                            title = details.title,
                            description = details.description,
                            formattedPrice = pricingPhase.formattedPrice,
                            priceMicros = pricingPhase.priceAmountMicros,
                            billingPeriod = pricingPhase.billingPeriod,
                            productDetails = details,
                            offerToken = offerDetails.offerToken
                        )
                    }.sortedBy { it.priceMicros }

                    Log.d(TAG, "Loaded ${products.size} products: ${products.map { it.productId }}")
                    _availableProducts.value = products
                } else {
                    Log.e(TAG, "Failed to query products: ${billingResult.debugMessage}")
                    _error.value = "Could not load subscription options"
                }
                continuation.resumeWith(Result.success(Unit))
            }
        }
    }

    // ── Query Tip Products (Consumables) ───────────────────────────────

    private suspend fun queryTipProducts() {
        val productList = TIP_PRODUCT_IDS.map { id ->
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        }

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        val client = billingClient ?: return

        suspendCancellableCoroutine { continuation ->
            client.queryProductDetailsAsync(params) { billingResult, detailsList ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    val tips = detailsList.mapNotNull { details ->
                        val pricing = details.oneTimePurchaseOfferDetails ?: return@mapNotNull null
                        TipProductInfo(
                            productId = details.productId,
                            title = details.title,
                            description = details.description,
                            formattedPrice = pricing.formattedPrice,
                            priceMicros = pricing.priceAmountMicros,
                            productDetails = details
                        )
                    }.sortedBy { it.priceMicros }

                    Log.d(TAG, "Loaded ${tips.size} tip products")
                    _tipProducts.value = tips
                } else {
                    Log.e(TAG, "Failed to query tip products: ${billingResult.debugMessage}")
                }
                continuation.resumeWith(Result.success(Unit))
            }
        }
    }

    // ── Launch Tip Purchase Flow ────────────────────────────────────────

    fun launchTipPurchaseFlow(activity: Activity, tip: TipProductInfo) {
        _isLoading.value = true
        _error.value = null

        val productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(tip.productDetails)
            .build()

        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productDetailsParams))
            .build()

        val result = billingClient?.launchBillingFlow(activity, billingFlowParams)
        if (result?.responseCode != BillingClient.BillingResponseCode.OK) {
            Log.e(TAG, "Failed to launch tip billing flow: ${result?.debugMessage}")
            _error.value = "Could not start purchase"
            _isLoading.value = false
        }
    }

    // ── Launch Purchase Flow ────────────────────────────────────────────

    fun launchPurchaseFlow(activity: Activity, product: ProductInfo) {
        _isLoading.value = true
        _error.value = null

        val productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(product.productDetails)
            .setOfferToken(product.offerToken)
            .build()

        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productDetailsParams))
            .build()

        val result = billingClient?.launchBillingFlow(activity, billingFlowParams)
        if (result?.responseCode != BillingClient.BillingResponseCode.OK) {
            Log.e(TAG, "Failed to launch billing flow: ${result?.debugMessage}")
            _error.value = "Could not start purchase"
            _isLoading.value = false
        }
    }

    // ── Purchase Callback ───────────────────────────────────────────────

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases?.forEach { purchase ->
                    scope.launch { handlePurchase(purchase) }
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                Log.d(TAG, "User cancelled purchase")
                _isLoading.value = false
            }
            else -> {
                Log.e(TAG, "Purchase failed: ${result.responseCode} - ${result.debugMessage}")
                _error.value = "Purchase failed. Please try again."
                _isLoading.value = false
            }
        }
    }

    private suspend fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            // Update local state
            val isSubscription = purchase.products.any { it in SUBSCRIPTION_PRODUCT_IDS }
            val isTip = purchase.products.any { it in TIP_PRODUCT_IDS }

            // Acknowledge subscriptions (consumables are acknowledged via consume)
            if (!isTip && !purchase.isAcknowledged) {
                val ackParams = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.purchaseToken)
                    .build()

                suspendCancellableCoroutine { continuation ->
                    billingClient?.acknowledgePurchase(ackParams) { ackResult ->
                        if (ackResult.responseCode == BillingClient.BillingResponseCode.OK) {
                            Log.d(TAG, "Purchase acknowledged")
                        } else {
                            Log.e(TAG, "Failed to acknowledge: ${ackResult.debugMessage}")
                        }
                        continuation.resumeWith(Result.success(Unit))
                    }
                }
            }

            if (isSubscription) {
                _isPlusSubscriber.value = true
                val productId = purchase.products.firstOrNull { it in SUBSCRIPTION_PRODUCT_IDS }
                syncToSupabase(productId = productId, isPlus = true)
            } else if (isTip) {
                // Consume the tip so it can be purchased again
                val consumeParams = ConsumeParams.newBuilder()
                    .setPurchaseToken(purchase.purchaseToken)
                    .build()
                billingClient?.consumeAsync(consumeParams) { result, _ ->
                    if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                        Log.d(TAG, "Tip consumed successfully")
                    }
                }
                _tipPurchaseSuccess.value = true
            }
        } else if (purchase.purchaseState == Purchase.PurchaseState.PENDING) {
            Log.d(TAG, "Purchase pending")
        }

        _isLoading.value = false
    }

    // ── Restore / Check Existing Purchases ──────────────────────────────

    fun restorePurchases() {
        scope.launch {
            _isLoading.value = true
            checkExistingPurchases()
            _isLoading.value = false
        }
    }

    private suspend fun checkExistingPurchases() {
        val client = billingClient ?: return
        if (!isServiceConnected) return

        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        suspendCancellableCoroutine { continuation ->
            client.queryPurchasesAsync(params) { billingResult, purchases ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    val hasActiveSub = purchases.any { purchase ->
                        purchase.purchaseState == Purchase.PurchaseState.PURCHASED &&
                            purchase.products.any { it in SUBSCRIPTION_PRODUCT_IDS }
                    }

                    Log.d(TAG, "Existing purchases check: hasActiveSub=$hasActiveSub, count=${purchases.size}")

                    // Acknowledge any unacknowledged purchases
                    purchases.filter {
                        it.purchaseState == Purchase.PurchaseState.PURCHASED && !it.isAcknowledged
                    }.forEach { purchase ->
                        scope.launch { handlePurchase(purchase) }
                    }

                    if (hasActiveSub) {
                        _isPlusSubscriber.value = true
                        val productId = purchases.flatMap { it.products }
                            .firstOrNull { it in SUBSCRIPTION_PRODUCT_IDS }
                        scope.launch { syncToSupabase(productId = productId, isPlus = true) }
                    } else {
                        // No active Google Play subscription -- check DB as fallback
                        // (handles web purchases, manual upgrades, promo grants, etc.)
                        scope.launch { checkDatabaseTier() }
                    }
                }
                continuation.resumeWith(Result.success(Unit))
            }
        }
    }

    private suspend fun checkDatabaseTier() {
        val uid = authManager.userId ?: return
        try {
            val row = supabase.postgrest.from("profiles")
                .select { filter { eq("id", uid) } }
                .decodeSingle<TierRow>()
            if (row.subscriptionTier == "plus") {
                Log.d(TAG, "Plus status from database tier")
                _isPlusSubscriber.value = true
            } else {
                _isPlusSubscriber.value = false
            }
        } catch (e: Exception) {
            Log.e(TAG, "DB tier check failed: ${e.message}")
            // Keep current state on error
        }
    }

    // ── Supabase Sync ───────────────────────────────────────────────────

    private suspend fun syncToSupabase(productId: String?, isPlus: Boolean) {
        val uid = authManager.userId ?: return
        try {
            val update = SubscriptionUpdate(
                subscriptionTier = if (isPlus) "plus" else "free",
                subscriptionProductId = productId,
                subscriptionPlatform = "android"
            )
            supabase.postgrest.from("profiles")
                .update(update) {
                    filter { eq("id", uid) }
                }
            Log.d(TAG, "Synced subscription to Supabase: tier=${update.subscriptionTier}")
            // Refresh the profile in AuthManager so the whole app sees the update
            authManager.fetchProfile()
        } catch (e: Exception) {
            Log.e(TAG, "Supabase sync error: ${e.message}")
        }
    }

    // ── Cleanup ─────────────────────────────────────────────────────────

    fun clearError() {
        _error.value = null
    }

    fun destroy() {
        billingClient?.endConnection()
        billingClient = null
        isServiceConnected = false
        scope.cancel()
    }
}
