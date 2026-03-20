package com.earwyrm.app.core.design

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage

/**
 * Renders a card art image as a subtle background texture with a gradient
 * overlay for text readability. Mirrors the iOS CardArtBackground component.
 *
 * @param imageUrl URL of the card art image. If null, nothing is rendered.
 * @param modifier Modifier for the container.
 * @param opacity Alpha applied to the image (default 0.08f for subtle texture).
 * @param contentScale How the image is scaled within the bounds.
 */
@Composable
fun CardArtBackground(
    imageUrl: String?,
    modifier: Modifier = Modifier,
    opacity: Float = 0.08f,
    contentScale: ContentScale = ContentScale.Crop
) {
    if (imageUrl == null) return

    val cardColor = Theme.card

    Box(modifier = modifier.fillMaxSize()) {
        AsyncImage(
            model = imageUrl,
            contentDescription = null,
            modifier = Modifier
                .fillMaxSize()
                .alpha(opacity),
            contentScale = contentScale
        )
        // Gradient overlay: transparent at top, card color at bottom for text readability
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            cardColor.copy(alpha = 0.3f),
                            cardColor.copy(alpha = 0.85f)
                        )
                    )
                )
        )
    }
}
