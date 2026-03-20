package com.earwyrm.app.feature.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.Theme

/**
 * A large, blurred cover art background for the SongPage header.
 * Renders the cover art at low opacity with a gradient fade to the theme background.
 */
@Composable
fun SongBackgroundView(
    coverArtUrl: String?,
    modifier: Modifier = Modifier
) {
    if (coverArtUrl == null) return

    Box(modifier = modifier.fillMaxWidth().height(300.dp)) {
        AsyncImage(
            model = coverArtUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxSize()
                .blur(40.dp)
                .alpha(0.18f)
        )

        // Gradient overlay: transparent at top -> background at bottom
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Theme.background.copy(alpha = 0.4f),
                            Theme.background
                        ),
                        startY = 0f,
                        endY = Float.POSITIVE_INFINITY
                    )
                )
        )
    }
}
