package com.earwyrm.app.core.design

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.foundation.layout.size
import androidx.compose.ui.unit.dp

@Composable
fun ResonateIcon(
    isActive: Boolean,
    modifier: Modifier = Modifier,
    color: Color = if (isActive) Theme.accent else Theme.textMuted,
    size: Dp = 20.dp
) {
    val barCount = 5
    val durations = listOf(800, 1000, 900, 1200, 1400)
    val phases = listOf(0, 150, 80, 200, 50)

    val infiniteTransition = rememberInfiniteTransition(label = "resonate")

    val animatedHeights = List(barCount) { i ->
        val animated by infiniteTransition.animateFloat(
            initialValue = 0.3f,
            targetValue = 1.0f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = durations[i], delayMillis = phases[i]),
                repeatMode = RepeatMode.Reverse
            ),
            label = "bar$i"
        )
        animated
    }

    // Smooth transition for each bar between active/inactive
    val barHeights = List(barCount) { i ->
        val target = if (isActive) animatedHeights[i] else 0.3f
        val smoothed by animateFloatAsState(
            targetValue = target,
            animationSpec = tween(durationMillis = 300),
            label = "smooth$i"
        )
        smoothed
    }

    val sizePx = with(LocalDensity.current) { size.toPx() }

    Canvas(modifier = modifier.then(Modifier.size(size))) {
        val totalGapRatio = 0.25f // 25% of width is gaps
        val gapWidth = (this.size.width * totalGapRatio) / (barCount - 1)
        val barWidth = (this.size.width - gapWidth * (barCount - 1)) / barCount
        val cornerRadius = CornerRadius(barWidth / 2f, barWidth / 2f)

        barHeights.forEachIndexed { i, heightFraction ->
            val barHeight = this.size.height * heightFraction
            val x = i * (barWidth + gapWidth)
            val y = this.size.height - barHeight // align bars to bottom

            drawRoundRect(
                color = color,
                topLeft = Offset(x, y),
                size = Size(barWidth, barHeight),
                cornerRadius = cornerRadius
            )
        }
    }
}
