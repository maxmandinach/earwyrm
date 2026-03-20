package com.earwyrm.app.feature.subscription

import android.app.Activity
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.subscription.BillingManager
import com.earwyrm.app.core.subscription.TipProductInfo

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TipJarSheet(
    billingManager: BillingManager,
    onDismiss: () -> Unit
) {
    val tipProducts by billingManager.tipProducts.collectAsState()
    val isLoading by billingManager.isLoading.collectAsState()
    val error by billingManager.error.collectAsState()
    val tipSuccess by billingManager.tipPurchaseSuccess.collectAsState()

    var showThankYou by remember { mutableStateOf(false) }

    // When tip purchase succeeds, show thank you then auto-dismiss
    LaunchedEffect(tipSuccess) {
        if (tipSuccess) {
            showThankYou = true
            kotlinx.coroutines.delay(2000)
            billingManager.clearTipPurchaseSuccess()
            onDismiss()
        }
    }

    // Clear tip success state when sheet first opens
    DisposableEffect(Unit) {
        billingManager.clearTipPurchaseSuccess()
        onDispose { billingManager.clearError() }
    }

    ModalBottomSheet(
        onDismissRequest = {
            if (!isLoading && !showThankYou) onDismiss()
        },
        containerColor = Theme.background,
        dragHandle = { BottomSheetDefaults.DragHandle(color = Theme.textMuted.copy(alpha = 0.4f)) }
    ) {
        AnimatedContent(
            targetState = showThankYou,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "tip_content"
        ) { isThankYou ->
            if (isThankYou) {
                ThankYouView()
            } else {
                TipOptionsView(
                    tipProducts = tipProducts,
                    isLoading = isLoading,
                    error = error,
                    billingManager = billingManager
                )
            }
        }
    }
}

@Composable
private fun ThankYouView() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = Icons.Filled.Favorite,
            contentDescription = null,
            tint = Theme.accent,
            modifier = Modifier.size(56.dp)
        )

        Text(
            text = "thank you",
            style = Theme.caveat(36f, FontWeight.Bold),
            color = Theme.textPrimary
        )

        Text(
            text = "your support means the world",
            style = Theme.dmSans(16f),
            color = Theme.textSecondary
        )
    }
}

@Composable
private fun TipOptionsView(
    tipProducts: List<TipProductInfo>,
    isLoading: Boolean,
    error: String?,
    billingManager: BillingManager
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(scrollState)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(8.dp))

        // Header
        Text(
            text = "support earwyrm",
            style = Theme.caveat(36f, FontWeight.Bold),
            color = Theme.accent
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = "earwyrm is indie-built. tips help keep it alive.",
            style = Theme.dmSans(15f),
            color = Theme.textSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(24.dp))

        if (tipProducts.isNotEmpty()) {
            tipProducts.forEach { tip ->
                TipButton(
                    tip = tip,
                    subtitle = tipSubtext(tip.productId),
                    isLoading = isLoading,
                    billingManager = billingManager
                )
                Spacer(Modifier.height(10.dp))
            }
        } else {
            // Fallback with hardcoded display while products load
            FallbackTipButtons(isLoading = isLoading, billingManager = billingManager)
        }

        // Error display
        if (error != null) {
            Spacer(Modifier.height(8.dp))
            Text(
                text = error,
                style = Theme.dmSans(13f),
                color = Theme.error.copy(alpha = 0.8f),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun TipButton(
    tip: TipProductInfo,
    subtitle: String,
    isLoading: Boolean,
    billingManager: BillingManager
) {
    val context = LocalContext.current
    val activity = context as? Activity

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(1.dp, Theme.divider, RoundedCornerShape(14.dp))
            .background(Theme.card)
            .clickable(enabled = !isLoading && activity != null) {
                activity?.let { billingManager.launchTipPurchaseFlow(it, tip) }
            }
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = tip.title.replace(" (Earwyrm)", ""),
                    style = Theme.dmSans(16f, FontWeight.Medium),
                    color = Theme.textPrimary
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    style = Theme.dmSans(13f),
                    color = Theme.textMuted
                )
            }
            Text(
                text = tip.formattedPrice,
                style = Theme.dmSans(16f, FontWeight.SemiBold),
                color = Theme.textPrimary
            )
        }

        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier
                    .size(20.dp)
                    .align(Alignment.Center),
                color = Theme.accent,
                strokeWidth = 2.dp
            )
        }
    }
}

@Composable
private fun FallbackTipButtons(
    isLoading: Boolean,
    billingManager: BillingManager
) {
    // Show loading state while tip products are being fetched
    val fallbackTips = listOf(
        Triple("Small Tip", "a kind gesture", "$1.99"),
        Triple("Medium Tip", "seriously generous", "$4.99"),
        Triple("Large Tip", "above and beyond", "$14.99")
    )

    fallbackTips.forEach { (title, subtitle, price) ->
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .border(1.dp, Theme.divider, RoundedCornerShape(14.dp))
                .background(Theme.card)
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = title,
                        style = Theme.dmSans(16f, FontWeight.Medium),
                        color = Theme.textPrimary.copy(alpha = 0.5f)
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = subtitle,
                        style = Theme.dmSans(13f),
                        color = Theme.textMuted.copy(alpha = 0.5f)
                    )
                }
                Text(
                    text = price,
                    style = Theme.dmSans(16f, FontWeight.SemiBold),
                    color = Theme.textPrimary.copy(alpha = 0.5f)
                )
            }

            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = Theme.accent,
                strokeWidth = 2.dp
            )
        }
        Spacer(Modifier.height(10.dp))
    }
}

private fun tipSubtext(productId: String): String = when (productId) {
    BillingManager.TIP_SMALL_ID -> "a kind gesture"
    BillingManager.TIP_MEDIUM_ID -> "seriously generous"
    BillingManager.TIP_LARGE_ID -> "above and beyond"
    else -> "thank you"
}
