package com.earwyrm.app.feature.explore

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.CardArtBackground
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.PlusBadge
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.util.formatRelativeTime

@Composable
fun CompactLyricCard(
    lyric: Lyric,
    username: String,
    isPlus: Boolean = false,
    hasReacted: Boolean = false,
    reactionCount: Int = 0,
    commentCount: Int = 0,
    isSaved: Boolean = false,
    onResonate: () -> Unit = {},
    onSave: () -> Unit = {},
    onShare: () -> Unit = {},
    onArtistClick: () -> Unit = {},
    onSongClick: () -> Unit = {},
    onUserClick: () -> Unit = {},
    onCommentClick: () -> Unit = {},
    onReportClick: () -> Unit = {}
) {
    val haptics = rememberHaptics()

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box {
            CardArtBackground(imageUrl = lyric.cardArtUrl ?: lyric.coverArtUrl)

            Column(modifier = Modifier.padding(14.dp)) {
                // User row + more menu
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .weight(1f)
                            .clickable { haptics.light(); onUserClick() }
                    ) {
                        Text(
                            text = "@$username",
                            style = Theme.dmSans(13f, FontWeight.SemiBold),
                            color = Theme.accent
                        )
                        if (isPlus) {
                            Spacer(modifier = Modifier.width(4.dp))
                            PlusBadge()
                        }
                    }

                    Text(
                        text = formatRelativeTime(lyric.createdAt),
                        style = Theme.dmSans(11f),
                        color = Theme.textMuted
                    )

                    // More menu
                    Box {
                        var showMenu by remember { mutableStateOf(false) }
                        IconButton(
                            onClick = { showMenu = true },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.MoreVert,
                                contentDescription = "More options",
                                tint = Theme.textMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        "Report",
                                        style = Theme.dmSans(14f),
                                        color = Theme.textPrimary
                                    )
                                },
                                onClick = { showMenu = false; onReportClick() }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Song info (clickable)
                if (lyric.songTitle != null || lyric.coverArtUrl != null) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (lyric.coverArtUrl != null) {
                            AsyncImage(
                                model = lyric.coverArtUrl,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(6.dp)),
                                contentScale = ContentScale.Crop
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            if (lyric.songTitle != null) {
                                Text(
                                    text = lyric.songTitle,
                                    style = Theme.dmSans(13f, FontWeight.Medium),
                                    color = Theme.textPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.clickable {
                                        haptics.light(); onSongClick()
                                    }
                                )
                            }
                            if (lyric.artistName != null) {
                                Text(
                                    text = lyric.artistName,
                                    style = Theme.dmSans(12f),
                                    color = Theme.textSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.clickable {
                                        haptics.light(); onArtistClick()
                                    }
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Lyric content
                Text(
                    text = lyric.content,
                    fontFamily = CaveatFamily,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Medium,
                    color = Theme.textPrimary,
                    lineHeight = 32.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Inline action row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Resonate
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = { haptics.light(); onResonate() },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = if (hasReacted) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                                contentDescription = "Resonate",
                                tint = if (hasReacted) Color(0xFFE74C3C) else Theme.textMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        if (reactionCount > 0) {
                            Text(
                                text = "$reactionCount",
                                style = Theme.dmSans(12f),
                                color = Theme.textSecondary
                            )
                        }
                    }

                    // Comments
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = { haptics.light(); onCommentClick() },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.ChatBubbleOutline,
                                contentDescription = "Comments",
                                tint = Theme.textMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        if (commentCount > 0) {
                            Text(
                                text = "$commentCount",
                                style = Theme.dmSans(12f),
                                color = Theme.textSecondary
                            )
                        }
                    }

                    // Save/Bookmark
                    IconButton(
                        onClick = { haptics.light(); onSave() },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = if (isSaved) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                            contentDescription = if (isSaved) "Unsave" else "Save",
                            tint = if (isSaved) Theme.accent else Theme.textMuted,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Share
                    IconButton(
                        onClick = { haptics.light(); onShare() },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Share,
                            contentDescription = "Share",
                            tint = Theme.textMuted,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}
