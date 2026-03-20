package com.earwyrm.app.feature.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.feature.share.ReportSheet

@Composable
fun FollowingTab(
    viewModel: ExploreViewModel,
    navController: NavHostController
) {
    val lyrics by viewModel.filteredFollowingLyrics.collectAsState()
    val profiles by viewModel.lyricProfiles.collectAsState()
    val reactedIds by viewModel.reactedLyricIds.collectAsState()
    val reactionDeltas by viewModel.reactionCountDeltas.collectAsState()
    val activeFilterIds by viewModel.activeFollowFilterIds.collectAsState()
    val haptics = rememberHaptics()
    var reportLyricId by remember { mutableStateOf<String?>(null) }
    var showFilterSheet by remember { mutableStateOf(false) }

    // Filter sheet
    if (showFilterSheet) {
        FollowFilterSheet(
            viewModel = viewModel,
            onDismiss = { showFilterSheet = false }
        )
    }

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

    if (lyrics.isEmpty() && activeFilterIds.isEmpty()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Follow artists, songs, or users to see their earwyrms here",
                style = Theme.dmSans(14f),
                color = Theme.textSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Theme.accent)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) {
                        haptics.light()
                        navController.navigate(Screen.FollowDiscovery.route)
                    }
                    .padding(horizontal = 24.dp, vertical = 12.dp)
            ) {
                Text(
                    text = "discover artists",
                    style = Theme.dmSans(14f, FontWeight.Medium),
                    color = Color.White
                )
            }
        }
    } else {
        Column(modifier = Modifier.fillMaxSize()) {
            // Filter bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.End
            ) {
                BadgedBox(
                    badge = {
                        if (activeFilterIds.isNotEmpty()) {
                            Badge(
                                containerColor = Theme.accent,
                                contentColor = Color.White
                            ) {
                                Text(
                                    text = activeFilterIds.size.toString(),
                                    style = Theme.dmSans(10f, FontWeight.Bold)
                                )
                            }
                        }
                    }
                ) {
                    IconButton(
                        onClick = {
                            haptics.light()
                            showFilterSheet = true
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.FilterList,
                            contentDescription = "Filter",
                            tint = if (activeFilterIds.isNotEmpty()) Theme.accent else Theme.textSecondary,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }

            // Active filter chips
            ActiveFilterChips(viewModel = viewModel)

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
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(Theme.card)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) {
                                haptics.light()
                                navController.navigate(Screen.FollowDiscovery.route)
                            }
                            .padding(horizontal = 20.dp, vertical = 10.dp)
                    ) {
                        Text(
                            text = "discover more artists",
                            style = Theme.dmSans(13f, FontWeight.Medium),
                            color = Theme.accent
                        )
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
        } // end Column
    }
}
