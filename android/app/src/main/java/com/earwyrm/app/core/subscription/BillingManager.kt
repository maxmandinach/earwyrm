package com.earwyrm.app.core.subscription

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BillingManager @Inject constructor(@ApplicationContext private val context: Context) : PurchasesUpdatedListener {
    companion object { const val PLUS_PRODUCT_ID = "earwyrm_plus_monthly" }
    private val _isPlus = MutableStateFlow(false)
    val isPlus: StateFlow<Boolean> = _isPlus.asStateFlow()
    private var billingClient: BillingClient? = null

    fun initialize() {
        billingClient = BillingClient.newBuilder(context).setListener(this).enablePendingPurchases().build()
        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(r: BillingResult) { if (r.responseCode == BillingClient.BillingResponseCode.OK) checkExisting() }
            override fun onBillingServiceDisconnected() { }
        })
    }

    private fun checkExisting() {
        billingClient?.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()) { _, purchases ->
            _isPlus.value = purchases.any { it.products.contains(PLUS_PRODUCT_ID) && it.purchaseState == Purchase.PurchaseState.PURCHASED }
        }
    }

    fun launchPurchaseFlow(activity: Activity) {
        val params = QueryProductDetailsParams.newBuilder().setProductList(listOf(QueryProductDetailsParams.Product.newBuilder().setProductId(PLUS_PRODUCT_ID).setProductType(BillingClient.ProductType.SUBS).build())).build()
        billingClient?.queryProductDetailsAsync(params) { _, list ->
            val pd = list.firstOrNull() ?: return@queryProductDetailsAsync
            val token = pd.subscriptionOfferDetails?.firstOrNull()?.offerToken ?: return@queryProductDetailsAsync
            billingClient?.launchBillingFlow(activity, BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(pd).setOfferToken(token).build())).build())
        }
    }

    override fun onPurchasesUpdated(r: BillingResult, purchases: MutableList<Purchase>?) {
        if (r.responseCode == BillingClient.BillingResponseCode.OK) purchases?.forEach { if (it.purchaseState == Purchase.PurchaseState.PURCHASED) _isPlus.value = true }
    }
}
