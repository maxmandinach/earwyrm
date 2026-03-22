package com.earwyrm.app.feature.home

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.CardArtBackground
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.ResonateIcon
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.LyricNote
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.core.util.formatRelativeTime

@Composable
fun LyricCardView(
    lyric: Lyric,
    note: LyricNote?,
    isCurrent: Boolean,
    hasReacted: Boolean,
    reactionCount: Int,
    onReactionToggle: () -> Unit,
    onVisibilityToggle: () -> Unit,
    onCommentClick: () -> Unit,
    onShareClick: () -> Unit,
    onEditClick: () -> Unit = {},
    onSaveClick: () -> Unit = {},
    navController: NavHostController
) {
    val reactionScale by animateFloatAsState(1.0f, spring(0.4f, 300f), label = "reaction")
    val haptics = rememberHaptics()

    // Responsive sizes based on isCurrent
    val coverArtSize = if (isCurrent) 56.dp else 40.dp
    val lyricFontSize = if (isCurrent) 26.sp else 22.sp
    val lyricLineHeight = if (isCurrent) 36.sp else 30.sp

    // Note collapse state
    var noteExpanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Box {
            CardArtBackground(imageUrl = lyric.cardArtUrl ?: lyric.coverArtUrl)
            Column(Modifier.padding(16.dp)) {
                // Song/artist metadata row
                if (lyric.songTitle != null || lyric.coverArtUrl != null) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (lyric.coverArtUrl != null) {
                            AsyncImage(
                                lyric.coverArtUrl,
                                "Album art",
                                Modifier
                                    .size(coverArtSize)
                                    .clip(RoundedCornerShape(8.dp)),
                                contentScale = ContentScale.Crop
                            )
                            Spacer(Modifier.width(12.dp))
                        }
                        Column(Modifier.weight(1f)) {
                            lyric.songTitle?.let {
                                Text(
                                    it,
                                    style = Theme.dmSans(15f, FontWeight.SemiBold),
                                    color = Theme.textPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.clickable {
                                        navController.navigate(
                                            Screen.SongPage.createRoute(lyric.songTitle, lyric.artistName)
                                        )
                                    }
                                )
                            }
                            lyric.artistName?.let {
                                Text(
                                    it,
                                    style = Theme.dmSans(13f),
                                    color = Theme.textSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.clickable {
                                        navController.navigate(
                                            Screen.ArtistPage.createRoute(it)
                                        )
                                    }
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }

                // Lyric text
                Text(
                    lyric.content,
                    fontFamily = CaveatFamily,
                    fontSize = lyricFontSize,
                    fontWeight = FontWeight.Medium,
                    color = Theme.textPrimary,
                    lineHeight = lyricLineHeight
                )

                // Accent rule separator
                Spacer(Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .width(80.dp)
                        .height(1.5.dp)
                        .background(Theme.accent.copy(alpha = 0.5f))
                )
                Spacer(Modifier.height(12.dp))

                // Note display (collapsible)
                if (note != null && note.content.isNotBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { noteExpanded = !noteExpanded }
                    ) {
                        if (note.isPublic != true) {
                            Icon(
                                Icons.Filled.Lock,
                                contentDescription = "Private note",
                                tint = Theme.textMuted,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(Modifier.width(4.dp))
                        }
                        Text(
                            "Note",
                            style = Theme.dmSans(12f, FontWeight.SemiBold),
                            color = Theme.textSecondary
                        )
                        Spacer(Modifier.weight(1f))
                        Icon(
                            if (noteExpanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                            contentDescription = if (noteExpanded) "Collapse" else "Expand",
                            tint = Theme.textMuted,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    if (noteExpanded) {
                        Spacer(Modifier.height(4.dp))
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(Theme.divider.copy(alpha = 0.3f))
                                .padding(8.dp)
                        ) {
                            Text(
                                note.content,
                                style = Theme.dmSansItalic(13f),
                                color = Theme.textSecondary,
                                maxLines = 5,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                // Tags — show all
                if (!lyric.tags.isNullOrEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        lyric.tags.forEach {
                            Text(
                                "#$it",
                                style = Theme.dmSans(12f),
                                color = Theme.accent,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(Theme.accent.copy(alpha = 0.1f))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                // Timestamp
                Spacer(Modifier.height(8.dp))
                Text(formatRelativeTime(lyric.createdAt), style = Theme.dmSans(11f), color = Theme.textMuted)

                // Action bar with haptics
                if (isCurrent) {
                    Spacer(Modifier.height(8.dp))
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(
                                onClick = { haptics.light(); onReactionToggle() },
                                Modifier.scale(reactionScale)
                            ) {
                                ResonateIcon(isActive = hasReacted, modifier = Modifier.size(20.dp))
                            }
                            if (reactionCount > 0) Text(
                                "$reactionCount",
                                style = Theme.dmSans(13f),
                                color = Theme.textSecondary
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = { haptics.light(); onCommentClick() }) {
                                Icon(
                                    Icons.Filled.ChatBubbleOutline,
                                    "Comments",
                                    tint = Theme.textMuted,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            (lyric.commentCount ?: 0).let {
                                if (it > 0) Text(
                                    "$it",
                                    style = Theme.dmSans(13f),
                                    color = Theme.textSecondary
                                )
                            }
                        }
                        IconButton(onClick = { haptics.light(); onSaveClick() }) {
                            Icon(
                                Icons.Filled.BookmarkBorder,
                                "Save",
                                tint = Theme.textMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        IconButton(onClick = { haptics.light(); onVisibilityToggle() }) {
                            Icon(
                                if (lyric.isPublic == true) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                "Toggle visibility",
                                tint = Theme.textMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        IconButton(onClick = { haptics.light(); onEditClick() }) {
                            Icon(
                                Icons.Filled.Edit,
                                "Edit",
                                tint = Theme.textMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        IconButton(onClick = { haptics.success(); onShareClick() }) {
                            Icon(
                                Icons.Filled.Share,
                                "Share",
                                tint = Theme.textMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
