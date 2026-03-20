package com.earwyrm.app.feature.artgallery

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Block
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.network.ArtVariant

/**
 * Drop-in artwork section showing a horizontal gallery strip with art variant thumbnails,
 * a "none" pill, and a generate button. Manages generation sheet and paywall presentation.
 */
@Composable
fun ArtGallerySection(
    state: ArtGalleryState,
    isPlus: Boolean,
    onSelectNone: () -> Unit,
    onSelectVariant: (Int) -> Unit,
    onGenerateClick: () -> Unit,
    onNavigateToPaywall: () -> Unit,
    modifier: Modifier = Modifier
) {
    var freeGenExhausted by remember { mutableStateOf(false) }

    // Handle upgrade-required flag
    LaunchedEffect(state.needsUpgrade) {
        if (state.needsUpgrade) {
            freeGenExhausted = true
            onNavigateToPaywall()
        }
    }

    // Track free tier gen exhaustion
    LaunchedEffect(state.wasFreeTierGen) {
        if (state.wasFreeTierGen) freeGenExhausted = true
    }

    val isLocked = !isPlus && !state.variants.isNotEmpty() && freeGenExhausted

    // Art preview overlay state
    var previewVariantIndex by remember { mutableIntStateOf(-1) }
    val showPreview = previewVariantIndex >= 0 && previewVariantIndex < state.variants.size

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Gallery strip
        ArtGalleryStrip(
            variants = state.variants,
            selectedStyle = state.selectedStyle,
            selectedVariantIndex = state.selectedVariantIndex,
            isGenerating = state.isGenerating,
            isLocked = isLocked,
            onSelectNone = onSelectNone,
            onSelectVariant = onSelectVariant,
            onLongPressVariant = { index -> previewVariantIndex = index },
            onGenerate = {
                if (isLocked) {
                    onNavigateToPaywall()
                } else {
                    onGenerateClick()
                }
            }
        )

        // Generating indicator (inline)
        if (state.isGenerating) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(14.dp),
                    color = Theme.accent,
                    strokeWidth = 2.dp
                )
                Text(
                    text = "generating artwork...",
                    style = Theme.dmSans(12f),
                    color = Theme.textSecondary
                )
            }
        }

        // Error display
        if (state.error != null) {
            Text(
                text = state.error,
                style = Theme.dmSans(12f),
                color = Theme.error.copy(alpha = 0.7f)
            )
        }
    }

    // Art preview overlay dialog
    if (showPreview) {
        val previewVariant = state.variants[previewVariantIndex]
        val isActive = state.selectedStyle == CardStyle.AI_VARIANT &&
                state.selectedVariantIndex == previewVariantIndex

        ArtPreviewOverlay(
            imageUrl = previewVariant.imageUrl,
            isActive = isActive,
            onSetActive = { onSelectVariant(previewVariantIndex) },
            onDismiss = { previewVariantIndex = -1 }
        )
    }
}

/**
 * Horizontal thumbnail carousel: none pill, AI variant thumbnails, generate pill.
 */
@Composable
fun ArtGalleryStrip(
    variants: List<ArtVariant>,
    selectedStyle: CardStyle,
    selectedVariantIndex: Int,
    isGenerating: Boolean,
    isLocked: Boolean,
    onSelectNone: () -> Unit,
    onSelectVariant: (Int) -> Unit,
    onLongPressVariant: (Int) -> Unit = {},
    onGenerate: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // "None" pill
        NonePill(
            isSelected = selectedStyle == CardStyle.NONE,
            onClick = onSelectNone
        )

        // AI variant thumbnails
        variants.forEachIndexed { index, variant ->
            ArtThumbnail(
                imageUrl = variant.imageUrl,
                isSelected = selectedStyle == CardStyle.AI_VARIANT && selectedVariantIndex == index,
                onClick = { onSelectVariant(index) },
                onLongPress = { onLongPressVariant(index) }
            )
        }

        // Generate pill
        GeneratePill(
            isGenerating = isGenerating,
            isLocked = isLocked,
            onClick = onGenerate
        )
    }
}

@Composable
private fun NonePill(isSelected: Boolean, onClick: () -> Unit) {
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.05f else 1.0f,
        animationSpec = tween(150),
        label = "nonePillScale"
    )

    Box(
        modifier = Modifier
            .size(56.dp)
            .scale(scale)
            .clip(RoundedCornerShape(10.dp))
            .background(Theme.card)
            .border(
                width = if (isSelected) 2.5.dp else 1.dp,
                color = if (isSelected) Theme.accent else Theme.divider.copy(alpha = 0.5f),
                shape = RoundedCornerShape(10.dp)
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Outlined.Block,
            contentDescription = "No art",
            tint = if (isSelected) Theme.accent else Theme.textMuted,
            modifier = Modifier.size(20.dp)
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ArtThumbnail(
    imageUrl: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    onLongPress: () -> Unit = {}
) {
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.05f else 1.0f,
        animationSpec = tween(150),
        label = "thumbScale"
    )

    Box(
        modifier = Modifier
            .size(56.dp)
            .scale(scale)
            .clip(RoundedCornerShape(10.dp))
            .border(
                width = if (isSelected) 2.5.dp else 1.dp,
                color = if (isSelected) Theme.accent else Theme.divider.copy(alpha = 0.5f),
                shape = RoundedCornerShape(10.dp)
            )
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongPress
            )
    ) {
        AsyncImage(
            model = imageUrl,
            contentDescription = "Art variant",
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        // Checkmark badge for selected variant
        if (isSelected) {
            Icon(
                imageVector = Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = Theme.accent,
                modifier = Modifier
                    .size(16.dp)
                    .align(Alignment.BottomEnd)
                    .offset(x = 3.dp, y = 3.dp)
                    .background(Color.White, CircleShape)
            )
        }
    }
}

@Composable
private fun GeneratePill(isGenerating: Boolean, isLocked: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(56.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(Theme.card)
            .border(
                width = 1.dp,
                color = Theme.divider.copy(alpha = 0.5f),
                shape = RoundedCornerShape(10.dp)
            )
            .clickable(enabled = !isGenerating, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        when {
            isGenerating -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = Theme.accent,
                    strokeWidth = 2.dp
                )
            }
            isLocked -> {
                Icon(
                    imageVector = Icons.Outlined.Lock,
                    contentDescription = "Upgrade required",
                    tint = Theme.textMuted,
                    modifier = Modifier.size(18.dp)
                )
            }
            else -> {
                Icon(
                    imageVector = Icons.Outlined.AutoAwesome,
                    contentDescription = "Generate art",
                    tint = Theme.accent,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
