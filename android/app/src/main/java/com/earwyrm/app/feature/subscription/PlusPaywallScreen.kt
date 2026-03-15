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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.navigation.NavHostController
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.design.PlusBadge
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.subscription.BillingManager
import com.earwyrm.app.core.subscription.ProductInfo
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class PlusPaywallViewModel @Inject constructor(
    val billingManager: BillingManager,
    val authManager: AuthManager
) : ViewModel()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlusPaywallScreen(
    navController: NavHostController,
    viewModel: PlusPaywallViewModel = hiltViewModel()
) {
    val billingManager = viewModel.billingManager
    val isPlus by billingManager.isPlusSubscriber.collectAsState()
    val products by billingManager.availableProducts.collectAsState()
    val isLoading by billingManager.isLoading.collectAsState()
    val error by billingManager.error.collectAsState()
    val profile by viewModel.authManager.profile.collectAsState()

    var showWelcome by remember { mutableStateOf(false) }
    val wasAlreadyPlus = remember { isPlus }

    // When purchase completes (isPlus transitions false->true), show welcome then auto-dismiss
    LaunchedEffect(isPlus) {
        if (isPlus && !wasAlreadyPlus && !showWelcome) {
            showWelcome = true
            kotlinx.coroutines.delay(2000)
            navController.popBackStack()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Theme.background)
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        // Top bar -- only show back button when not in welcome state
        if (!showWelcome) {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Theme.textPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        }

        AnimatedContent(
            targetState = showWelcome,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "paywall_content"
        ) { isWelcome ->
            if (isWelcome) {
                WelcomeView()
            } else {
                PurchaseView(
                    products = products,
                    isLoading = isLoading,
                    error = error,
                    isAlreadyPlus = profile?.isPlus == true,
                    billingManager = billingManager
                )
            }
        }
    }
}

@Composable
private fun WelcomeView() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = Theme.accent,
                modifier = Modifier.size(56.dp)
            )

            Text(
                text = "welcome to earwyrm+",
                style = Theme.caveat(36f, FontWeight.Bold),
                color = Theme.textPrimary
            )

            Text(
                text = "you're all set",
                style = Theme.dmSans(16f),
                color = Theme.textSecondary
            )
        }
    }
}

@Composable
private fun PurchaseView(
    products: List<ProductInfo>,
    isLoading: Boolean,
    error: String?,
    isAlreadyPlus: Boolean,
    billingManager: BillingManager
) {
    val scrollState = rememberScrollState()
    val uriHandler = LocalUriHandler.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(16.dp))

        // Header
        Text(
            text = "earwyrm+",
            style = Theme.caveat(42f, FontWeight.Bold),
            color = Theme.accent
        )

        Spacer(Modifier.height(4.dp))

        Text(
            text = "support earwyrm & unlock everything",
            style = Theme.dmSans(16f),
            color = Theme.textSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(24.dp))

        // Feature rows
        FeatureRow(
            icon = Icons.Outlined.AutoAwesome,
            title = "AI-generated lyric art",
            subtitle = "100 generations per month"
        )
        Spacer(Modifier.height(10.dp))
        FeatureRow(
            icon = Icons.Outlined.Layers,
            title = "Custom collections",
            subtitle = "Free tier includes favorites only"
        )
        Spacer(Modifier.height(10.dp))
        FeatureRow(
            useBadge = true,
            title = "Plus badge on your profile",
            subtitle = "Show your support everywhere"
        )

        Spacer(Modifier.height(24.dp))

        if (isAlreadyPlus) {
            // Already subscribed state
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(Theme.accent.copy(alpha = 0.12f))
                    .padding(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = Theme.accent,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "You're an Earwyrm+ subscriber",
                        style = Theme.dmSans(16f, FontWeight.SemiBold),
                        color = Theme.textPrimary
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Thank you for your support!",
                        style = Theme.dmSans(14f),
                        color = Theme.textSecondary
                    )
                }
            }
        } else {
            // Purchase buttons
            val monthly = products.find { it.productId == BillingManager.MONTHLY_PRODUCT_ID }
            val yearly = products.find { it.productId == BillingManager.YEARLY_PRODUCT_ID }

            if (monthly != null) {
                SubscriptionButton(
                    product = monthly,
                    label = "Monthly",
                    periodLabel = "per month",
                    highlight = false,
                    isLoading = isLoading,
                    billingManager = billingManager
                )
            }

            if (yearly != null) {
                Spacer(Modifier.height(10.dp))
                SubscriptionButton(
                    product = yearly,
                    label = "Yearly",
                    periodLabel = "per year",
                    highlight = true,
                    savingsLabel = "save 30%",
                    isLoading = isLoading,
                    billingManager = billingManager
                )
            }

            if (products.isEmpty() && error == null) {
                Spacer(Modifier.height(16.dp))
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Theme.accent,
                    strokeWidth = 2.dp
                )
            }
        }

        // Error display
        if (error != null) {
            Spacer(Modifier.height(12.dp))
            Text(
                text = error,
                style = Theme.dmSans(13f),
                color = Theme.error.copy(alpha = 0.8f),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(Modifier.height(20.dp))

        // Restore purchases
        if (!isAlreadyPlus) {
            TextButton(onClick = { billingManager.restorePurchases() }) {
                Text(
                    "Restore Purchases",
                    style = Theme.dmSans(14f),
                    color = Theme.accent
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        // Legal links
        Row(
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Terms of Use",
                style = Theme.dmSans(12f),
                color = Theme.textMuted,
                modifier = Modifier.clickable {
                    uriHandler.openUri("https://earwyrm.app/terms")
                }
            )
            Spacer(Modifier.width(12.dp))
            Text(
                text = "\u00B7",
                style = Theme.dmSans(12f),
                color = Theme.textMuted
            )
            Spacer(Modifier.width(12.dp))
            Text(
                text = "Privacy Policy",
                style = Theme.dmSans(12f),
                color = Theme.textMuted,
                modifier = Modifier.clickable {
                    uriHandler.openUri("https://earwyrm.app/privacy")
                }
            )
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun FeatureRow(
    icon: ImageVector? = null,
    useBadge: Boolean = false,
    title: String,
    subtitle: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Theme.card)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(modifier = Modifier.width(36.dp), contentAlignment = Alignment.Center) {
            if (useBadge) {
                PlusBadge()
            } else if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Theme.accent,
                    modifier = Modifier.size(24.dp)
                )
            }
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = Theme.dmSans(15f, FontWeight.Medium),
                color = Theme.textPrimary
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = Theme.dmSans(13f),
                color = Theme.textMuted
            )
        }
    }
}

@Composable
private fun SubscriptionButton(
    product: ProductInfo,
    label: String,
    periodLabel: String,
    highlight: Boolean,
    savingsLabel: String? = null,
    isLoading: Boolean,
    billingManager: BillingManager
) {
    val context = LocalContext.current
    val activity = context as? Activity

    val backgroundColor = if (highlight) Theme.accent else Theme.card
    val contentColor = if (highlight) Color.White else Theme.textPrimary
    val subtitleColor = if (highlight) Color.White.copy(alpha = 0.7f) else Theme.textMuted

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .then(
                if (highlight) Modifier
                else Modifier.border(1.dp, Theme.divider, RoundedCornerShape(14.dp))
            )
            .background(backgroundColor)
            .clickable(enabled = !isLoading && activity != null) {
                activity?.let { billingManager.launchPurchaseFlow(it, product) }
            }
            .padding(16.dp)
            .then(if (isLoading) Modifier.then(Modifier) else Modifier) // keep layout stable
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = label,
                        style = Theme.dmSans(16f, FontWeight.SemiBold),
                        color = contentColor
                    )
                    if (savingsLabel != null) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(
                                    if (highlight) Color.White.copy(alpha = 0.2f)
                                    else Theme.accent.copy(alpha = 0.2f)
                                )
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = savingsLabel,
                                style = Theme.dmSans(12f, FontWeight.Medium),
                                color = contentColor
                            )
                        }
                    }
                }
                Text(
                    text = product.formattedPrice,
                    style = Theme.dmSans(16f, FontWeight.SemiBold),
                    color = contentColor
                )
            }
            Spacer(Modifier.height(2.dp))
            Text(
                text = periodLabel,
                style = Theme.dmSans(13f),
                color = subtitleColor
            )
        }

        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier
                    .size(20.dp)
                    .align(Alignment.Center),
                color = contentColor,
                strokeWidth = 2.dp
            )
        }
    }
}
