package com.earwyrm.app.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.CardArtBackground
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.ResonateIcon
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.util.formatRelativeTime

/**
 * Compact lyric row for use in profile tabs (Lyrics, Resonated).
 * Shows key info at a glance: lyric content, song/artist, date,
 * reaction and comment counts. Optional card art background.
 *
 * More compact than LyricCardView or ExploreLyricCard.
 */
@Composable
fun ProfileLyricRow(
    lyric: Lyric,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Box {
            // Subtle card art background
            CardArtBackground(
                imageUrl = lyric.cardArtUrl,
                opacity = 0.15f
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 12.dp)
            ) {
                // Top row: "CURRENT" badge + relative date
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (lyric.isCurrent == true) {
                        Text(
                            text = "CURRENT",
                            style = Theme.dmSans(9f, FontWeight.SemiBold),
                            color = androidx.compose.ui.graphics.Color.White,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(Theme.accent)
                                .padding(horizontal = 7.dp, vertical = 1.dp)
                        )
                    } else {
                        Spacer(Modifier.width(0.dp))
                    }

                    Text(
                        text = formatRelativeTime(lyric.createdAt),
                        style = Theme.dmSans(11f),
                        color = Theme.textMuted
                    )
                }

                Spacer(Modifier.height(6.dp))

                // Lyric content (Caveat, 3 lines max)
                Text(
                    text = lyric.content,
                    fontFamily = CaveatFamily,
                    fontWeight = FontWeight.Medium,
                    fontSize = androidx.compose.ui.unit.TextUnit(20f, androidx.compose.ui.unit.TextUnitType.Sp),
                    color = Theme.textPrimary,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = androidx.compose.ui.unit.TextUnit(26f, androidx.compose.ui.unit.TextUnitType.Sp)
                )

                // Song title + artist
                if (lyric.songTitle != null || lyric.artistName != null) {
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (lyric.songTitle != null) {
                            Text(
                                text = lyric.songTitle,
                                style = Theme.dmSansItalic(12f),
                                color = Theme.accent,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )
                        }
                        if (lyric.songTitle != null && lyric.artistName != null) {
                            Text(
                                text = " \u2014 ",
                                style = Theme.dmSans(12f),
                                color = Theme.textMuted
                            )
                        }
                        if (lyric.artistName != null) {
                            Text(
                                text = lyric.artistName,
                                style = Theme.dmSansItalic(12f),
                                color = Theme.accent,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                // Reaction + comment counts
                val reactionCount = lyric.reactionCount ?: 0
                val commentCount = lyric.commentCount ?: 0
                if (reactionCount > 0 || commentCount > 0) {
                    Spacer(Modifier.height(6.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (reactionCount > 0) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                ResonateIcon(
                                    isActive = false,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = "$reactionCount",
                                    style = Theme.dmSans(12f),
                                    color = Theme.textMuted
                                )
                            }
                        }
                        if (commentCount > 0) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.ChatBubbleOutline,
                                    contentDescription = null,
                                    tint = Theme.textMuted,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = "$commentCount",
                                    style = Theme.dmSans(12f),
                                    color = Theme.textMuted
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
