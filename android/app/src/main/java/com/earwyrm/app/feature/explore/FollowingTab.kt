package com.earwyrm.app.feature.explore

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.earwyrm.app.core.design.Theme

@Composable
fun FollowingTab(
    viewModel: ExploreViewModel,
    navController: NavHostController
) {
    val lyrics by viewModel.filteredFollowingLyrics.collectAsState()
    val profiles by viewModel.lyricProfiles.collectAsState()
    val reactedIds by viewModel.reactedLyricIds.collectAsState()
    val reactionDeltas by viewModel.reactionCountDeltas.collectAsState()

    if (lyrics.isEmpty()) {
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
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(lyrics, key = { it.id }) { lyric ->
                ExploreLyricCard(
                    lyric = lyric,
                    profile = profiles[lyric.userId],
                    navController = navController,
                    hasReacted = lyric.id in reactedIds,
                    reactionCount = (lyric.reactionCount ?: 0) + (reactionDeltas[lyric.id] ?: 0),
                    onReactionToggle = { viewModel.toggleReaction(lyric.id) },
                    onShareClick = { /* TODO */ }
                )
            }
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}
