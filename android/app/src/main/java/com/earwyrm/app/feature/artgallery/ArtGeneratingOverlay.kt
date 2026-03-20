package com.earwyrm.app.feature.artgallery

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme

/**
 * Loading overlay shown while AI art is being generated.
 * Cannot be dismissed -- controlled by the parent composable.
 * Mirrors the iOS ArtGeneratingOverlay with pulsing icon and shimmer text.
 */
@Composable
fun ArtGeneratingOverlay(
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "artGen")

    // Pulsing ring scale
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.9f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    // Pulsing ring alpha (fades out as it expands)
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 0.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    // Wand rotation wobble
    val wandRotation by infiniteTransition.animateFloat(
        initialValue = -5f,
        targetValue = 5f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500),
            repeatMode = RepeatMode.Reverse
        ),
        label = "wandRotation"
    )

    // Shimmer offset for text
    val shimmerOffset by infiniteTransition.animateFloat(
        initialValue = -200f,
        targetValue = 250f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerOffset"
    )

    // Text pulse
    val textAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200),
            repeatMode = RepeatMode.Reverse
        ),
        label = "textAlpha"
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier
                .clip(RoundedCornerShape(16.dp))
                .background(Theme.card.copy(alpha = 0.95f))
                .size(width = 220.dp, height = 180.dp),
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .weight(1f)
                    .offset(y = 12.dp)
            ) {
                // Outer pulsing ring
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .scale(pulseScale)
                        .alpha(pulseAlpha)
                        .background(Theme.accent.copy(alpha = 0.12f), CircleShape)
                )

                // Inner circle
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(Theme.accent.copy(alpha = 0.07f), CircleShape)
                )

                // Wand icon
                Icon(
                    imageVector = Icons.Outlined.AutoAwesome,
                    contentDescription = null,
                    tint = Theme.accent,
                    modifier = Modifier
                        .size(24.dp)
                        .rotate(wandRotation)
                )
            }

            // Text with pulse
            Text(
                text = "creating your artwork",
                style = Theme.caveat(22f, FontWeight.Medium),
                color = Theme.textSecondary,
                modifier = Modifier
                    .alpha(textAlpha)
                    .offset(y = (-16).dp)
            )
        }
    }
}
