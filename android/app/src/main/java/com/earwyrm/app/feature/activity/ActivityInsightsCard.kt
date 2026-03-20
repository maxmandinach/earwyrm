package com.earwyrm.app.feature.activity

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ActivityInsightsCard(
    viewModel: ActivityInsightsViewModel,
    onTapMemory: ((Lyric) -> Unit)? = null
) {
    val hasAnything by viewModel.hasAnythingToShow.collectAsState()
    val lyricsThisWeek by viewModel.lyricsThisWeek.collectAsState()
    val resonancesThisWeek by viewModel.resonancesThisWeek.collectAsState()
    val onThisDayLyric by viewModel.onThisDayLyric.collectAsState()
    val onThisDayLabel by viewModel.onThisDayLabel.collectAsState()

    if (!hasAnything) return

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Your Week section
            if (lyricsThisWeek > 0 || resonancesThisWeek > 0) {
                Text(
                    text = "your week",
                    fontFamily = CaveatFamily,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Medium,
                    color = Theme.textSecondary
                )

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (lyricsThisWeek > 0) {
                        StatPill(
                            value = "$lyricsThisWeek",
                            label = if (lyricsThisWeek == 1) "lyric" else "lyrics"
                        )
                    }
                    if (resonancesThisWeek > 0) {
                        StatPill(
                            value = "$resonancesThisWeek",
                            label = if (resonancesThisWeek == 1) "resonance" else "resonances"
                        )
                    }
                }
            }

            // Divider between sections
            if ((lyricsThisWeek > 0 || resonancesThisWeek > 0) && onThisDayLyric != null) {
                HorizontalDivider(color = Theme.divider)
            }

            // On This Day section
            val lyric = onThisDayLyric
            val label = onThisDayLabel
            if (lyric != null && label != null) {
                OnThisDaySection(
                    lyric = lyric,
                    label = label,
                    onTap = { onTapMemory?.invoke(lyric) }
                )
            }
        }
    }
}

@Composable
private fun StatPill(value: String, label: String) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(Theme.accent.copy(alpha = 0.12f))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = value,
            style = Theme.dmSans(13f, FontWeight.SemiBold),
            color = Theme.accent
        )
        Text(
            text = label,
            style = Theme.dmSans(13f, FontWeight.Medium),
            color = Theme.textPrimary
        )
    }
}

@Composable
private fun OnThisDaySection(
    lyric: Lyric,
    label: String,
    onTap: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onTap() },
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = "on this day",
            fontFamily = CaveatFamily,
            fontSize = 22.sp,
            fontWeight = FontWeight.Medium,
            color = Theme.textSecondary
        )

        Text(
            text = label,
            style = Theme.dmSans(13f),
            color = Theme.textMuted
        )

        Text(
            text = "\u201C${lyric.content}\u201D",
            fontFamily = CaveatFamily,
            fontSize = 20.sp,
            color = Theme.textPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        val songInfo = listOfNotNull(lyric.songTitle, lyric.artistName)
            .joinToString(" \u2014 ")
        if (songInfo.isNotEmpty()) {
            Text(
                text = songInfo,
                style = Theme.dmSansItalic(12f),
                color = Theme.textSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
