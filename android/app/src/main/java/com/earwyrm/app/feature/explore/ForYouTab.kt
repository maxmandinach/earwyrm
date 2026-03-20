package com.earwyrm.app.feature.explore

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.compose.runtime.collectAsState
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.PlusBadge
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.Profile
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.core.util.formatRelativeTime
import com.earwyrm.app.feature.share.ReportSheet

@Composable
fun ForYouTab(
    viewModel: ExploreViewModel,
    navController: NavHostController
) {
    val lyrics by viewModel.filteredForYouLyrics.collectAsState()
    val profiles by viewModel.lyricProfiles.collectAsState()
    val reactedIds by viewModel.reactedLyricIds.collectAsState()
    val reactionDeltas by viewModel.reactionCountDeltas.collectAsState()
    val haptics = rememberHaptics()
    var reportLyricId by remember { mutableStateOf<String?>(null) }

    // Report sheet
    reportLyricId?.let { lyricId ->
        val reporterId = viewModel.getReporterId()
        if (reporterId != null) {
            ReportSheet(
                contentType = "lyric",
                contentId = lyricId,
                reporterId = reporterId,
                blockManager = viewModel.getBlockManager(),
                onDismiss = { reportLyricId = null }
            )
        }
    }

    if (lyrics.isEmpty()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "No public earwyrms yet",
                style = Theme.dmSans(16f),
                color = Theme.textSecondary,
                textAlign = TextAlign.Center
            )
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(lyrics, key = { it.id }) { lyric ->
                val profile = profiles[lyric.userId]
                CompactLyricCard(
                    lyric = lyric,
                    username = profile?.username ?: "...",
                    isPlus = profile?.isPlus == true,
                    hasReacted = lyric.id in reactedIds,
                    reactionCount = (lyric.reactionCount ?: 0) + (reactionDeltas[lyric.id] ?: 0),
                    commentCount = lyric.commentCount ?: 0,
                    onResonate = { haptics.light(); viewModel.toggleReaction(lyric.id) },
                    onShare = { /* TODO */ },
                    onSongClick = {
                        lyric.songTitle?.let { title ->
                            navController.navigate(Screen.SongPage.createRoute(title, lyric.artistName))
                        }
                    },
                    onUserClick = {
                        profile?.username?.let { navController.navigate(Screen.PublicProfile.createRoute(it)) }
                    },
                    onReportClick = { reportLyricId = lyric.id }
                )
            }
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
fun ExploreLyricCard(
    lyric: Lyric,
    profile: Profile?,
    navController: NavHostController,
    hasReacted: Boolean = false,
    reactionCount: Int = lyric.reactionCount ?: 0,
    onReactionToggle: () -> Unit = {},
    onShareClick: () -> Unit = {},
    onReportClick: () -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // User info + more menu
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .weight(1f)
                        .clickable {
                            profile?.username?.let {
                                navController.navigate(Screen.PublicProfile.createRoute(it))
                            }
                        }
                ) {
                    Text(
                        text = "@${profile?.username ?: "..."}",
                        style = Theme.dmSans(13f, FontWeight.SemiBold),
                        color = Theme.accent
                    )
                    if (profile?.isPlus == true) {
                        Spacer(modifier = Modifier.width(4.dp))
                        PlusBadge()
                    }
                }

                // More options menu
                Box {
                    var showCardMenu by remember { mutableStateOf(false) }
                    IconButton(
                        onClick = { showCardMenu = true },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.MoreVert,
                            contentDescription = "More options",
                            tint = Theme.textMuted,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    DropdownMenu(
                        expanded = showCardMenu,
                        onDismissRequest = { showCardMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Report", style = Theme.dmSans(14f), color = Theme.textPrimary) },
                            onClick = { showCardMenu = false; onReportClick() }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Song info
            if (lyric.songTitle != null || lyric.coverArtUrl != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable {
                        if (lyric.songTitle != null) {
                            navController.navigate(
                                Screen.SongPage.createRoute(lyric.songTitle, lyric.artistName)
                            )
                        }
                    }
                ) {
                    if (lyric.coverArtUrl != null) {
                        AsyncImage(
                            model = lyric.coverArtUrl,
                            contentDescription = null,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(6.dp)),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                    }
                    Column {
                        if (lyric.songTitle != null) {
                            Text(
                                text = lyric.songTitle,
                                style = Theme.dmSans(14f, FontWeight.Medium),
                                color = Theme.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
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
                                    navController.navigate(
                                        Screen.ArtistPage.createRoute(lyric.artistName)
                                    )
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
                fontSize = 20.sp,
                fontWeight = FontWeight.Medium,
                color = Theme.textPrimary,
                lineHeight = 28.sp
            )

            // Tags
            if (!lyric.tags.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    lyric.tags.take(3).forEach { tag ->
                        Text(
                            text = "#$tag",
                            style = Theme.dmSans(11f),
                            color = Theme.accent
                        )
                    }
                }
            }

            // Timestamp
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = formatRelativeTime(lyric.createdAt),
                style = Theme.dmSans(11f),
                color = Theme.textMuted
            )

            // Action bar
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Resonate button
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onReactionToggle) {
                        Icon(
                            imageVector = if (hasReacted) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = "Resonate",
                            tint = if (hasReacted) Color(0xFFE74C3C) else Theme.textMuted,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    if (reactionCount > 0) {
                        Text(
                            text = "$reactionCount",
                            style = Theme.dmSans(13f),
                            color = Theme.textSecondary
                        )
                    }
                }

                // Comment count
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { /* TODO: navigate to comments */ }) {
                        Icon(
                            imageVector = Icons.Filled.ChatBubbleOutline,
                            contentDescription = "Comments",
                            tint = Theme.textMuted,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    (lyric.commentCount ?: 0).let { count ->
                        if (count > 0) {
                            Text(
                                text = "$count",
                                style = Theme.dmSans(13f),
                                color = Theme.textSecondary
                            )
                        }
                    }
                }

                // Share button
                IconButton(onClick = onShareClick) {
                    Icon(
                        imageVector = Icons.Filled.Share,
                        contentDescription = "Share",
                        tint = Theme.textMuted,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
