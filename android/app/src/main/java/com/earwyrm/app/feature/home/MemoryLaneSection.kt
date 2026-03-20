package com.earwyrm.app.feature.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.feature.subscription.MemoryLaneUpsellCard
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlin.math.abs

@Composable
fun MemoryLaneSection(
    pastLyrics: List<Lyric>,
    isPlus: Boolean = true,
    onLyricClick: (Lyric) -> Unit = {},
    onUpgrade: () -> Unit = {}
) {
    if (pastLyrics.isEmpty() && isPlus) return

    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(500, delayMillis = 300)) + slideInVertically(
            initialOffsetY = { it / 4 },
            animationSpec = tween(500, delayMillis = 300)
        )
    ) {
        Column {
            Text(
                "memory lane",
                fontFamily = CaveatFamily,
                fontSize = 24.sp,
                fontWeight = FontWeight.Medium,
                color = Theme.textSecondary,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(Modifier.height(8.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(pastLyrics, key = { it.id }) { lyric ->
                    MemoryLaneCard(
                        lyric = lyric,
                        onClick = { onLyricClick(lyric) }
                    )
                }
                if (!isPlus) {
                    item(key = "upsell") {
                        MemoryLaneUpsellCard(onUpgrade = onUpgrade)
                    }
                }
            }
        }
    }
}

@Composable
private fun MemoryLaneCard(
    lyric: Lyric,
    onClick: () -> Unit = {}
) {
    val backgroundUrl = lyric.cardArtUrl ?: lyric.coverArtUrl

    Card(
        modifier = Modifier
            .width(240.dp)
            .height(150.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(Modifier.fillMaxSize()) {
            // Optional background art at low opacity
            if (backgroundUrl != null) {
                AsyncImage(
                    model = backgroundUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop,
                    alpha = 0.08f
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(14.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Lyric content quoted
                Text(
                    text = "\u201C${lyric.content}\u201D",
                    fontFamily = CaveatFamily,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Medium,
                    color = Theme.textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 26.sp
                )

                Column {
                    // Song title + artist
                    if (lyric.songTitle != null || lyric.artistName != null) {
                        Text(
                            text = buildString {
                                lyric.songTitle?.let { append(it) }
                                if (lyric.songTitle != null && lyric.artistName != null) append(" — ")
                                lyric.artistName?.let { append(it) }
                            },
                            style = Theme.dmSansItalic(12f),
                            color = Theme.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(Modifier.height(6.dp))
                    }

                    // Duration badge
                    val durationText = formatDuration(lyric.createdAt, lyric.replacedAt)
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Theme.accent)
                            .padding(horizontal = 10.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = durationText,
                            style = Theme.dmSans(11f, FontWeight.Medium),
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

private fun formatDuration(createdAt: Instant, replacedAt: Instant?): String {
    if (replacedAt == null) return "current"

    val durationMs = abs((replacedAt - createdAt).inWholeMilliseconds)
    val hours = durationMs / (1000 * 60 * 60)
    val days = hours / 24

    return when {
        days > 0 -> "for ${days} day${if (days != 1L) "s" else ""}"
        hours > 0 -> "for ${hours} hour${if (hours != 1L) "s" else ""}"
        else -> "for < 1 hour"
    }
}
