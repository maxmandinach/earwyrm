package com.earwyrm.app.feature.explore

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Album
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.PlusBadge
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.feature.share.ReportSheet

@Composable
fun ExploreSearchResults(
    viewModel: ExploreViewModel,
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    val results by viewModel.searchResults.collectAsState()
    val isSearching by viewModel.isSearching.collectAsState()
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

    if (isSearching) {
        Column(
            modifier = modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            CircularProgressIndicator(
                color = Theme.accent,
                modifier = Modifier.size(24.dp),
                strokeWidth = 2.dp
            )
        }
        return
    }

    if (results.isEmpty) {
        Column(
            modifier = modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "No results found",
                style = Theme.dmSans(16f),
                color = Theme.textSecondary,
                textAlign = TextAlign.Center
            )
        }
        return
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Songs section
        if (results.songs.isNotEmpty()) {
            item {
                SectionHeader(title = "Songs")
            }
            items(results.songs, key = { "song-${it.first}-${it.second}" }) { (title, artist) ->
                SongResultRow(
                    title = title,
                    artist = artist,
                    onClick = {
                        navController.navigate(Screen.SongPage.createRoute(title, artist))
                    }
                )
            }
            item { Spacer(modifier = Modifier.height(8.dp)) }
        }

        // Artists section
        if (results.artists.isNotEmpty()) {
            item {
                SectionHeader(title = "Artists")
            }
            items(results.artists, key = { "artist-$it" }) { artist ->
                ArtistResultRow(
                    artist = artist,
                    onClick = {
                        navController.navigate(Screen.ArtistPage.createRoute(artist))
                    }
                )
            }
            item { Spacer(modifier = Modifier.height(8.dp)) }
        }

        // Users section
        if (results.users.isNotEmpty()) {
            item {
                SectionHeader(title = "Users")
            }
            items(results.users, key = { "user-${it.id}" }) { profile ->
                UserResultRow(
                    profile = profile,
                    onClick = {
                        navController.navigate(Screen.PublicProfile.createRoute(profile.username))
                    }
                )
            }
            item { Spacer(modifier = Modifier.height(8.dp)) }
        }

        // Lyrics section
        if (results.lyrics.isNotEmpty()) {
            item {
                SectionHeader(title = "Lyrics")
            }
            items(results.lyrics, key = { "lyric-${it.id}" }) { lyric ->
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
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = Theme.dmSans(16f, FontWeight.SemiBold),
        color = Theme.textPrimary,
        modifier = Modifier.padding(vertical = 4.dp)
    )
}

@Composable
private fun SongResultRow(
    title: String,
    artist: String?,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.MusicNote,
                contentDescription = null,
                tint = Theme.accent,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = Theme.dmSans(14f, FontWeight.Medium),
                    color = Theme.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (artist != null) {
                    Text(
                        text = artist,
                        style = Theme.dmSans(12f),
                        color = Theme.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun ArtistResultRow(
    artist: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Album,
                contentDescription = null,
                tint = Theme.accent,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = artist,
                style = Theme.dmSans(14f, FontWeight.Medium),
                color = Theme.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun UserResultRow(
    profile: com.earwyrm.app.core.model.Profile,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (profile.avatarUrl != null) {
                AsyncImage(
                    model = profile.avatarUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            } else {
                Icon(
                    imageVector = Icons.Filled.Person,
                    contentDescription = null,
                    tint = Theme.accent,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "@${profile.username}",
                        style = Theme.dmSans(14f, FontWeight.Medium),
                        color = Theme.accent,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (profile.isPlus) {
                        Spacer(modifier = Modifier.width(4.dp))
                        PlusBadge()
                    }
                }
                if (profile.displayName != null) {
                    Text(
                        text = profile.displayName,
                        style = Theme.dmSans(12f),
                        color = Theme.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
