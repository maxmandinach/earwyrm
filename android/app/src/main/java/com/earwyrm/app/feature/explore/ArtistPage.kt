package com.earwyrm.app.feature.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.feature.share.PageShareSheet
import com.earwyrm.app.feature.share.ReportSheet

private fun formatCompact(value: Int): String {
    return when {
        value >= 1_000_000 -> String.format("%.1fM", value / 1_000_000.0)
        value >= 1_000 -> String.format("%.1fk", value / 1_000.0)
        else -> value.toString()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArtistPage(
    artistName: String,
    navController: NavHostController
) {
    val viewModel: ArtistPageViewModel = hiltViewModel()
    val lyrics by viewModel.filteredLyrics.collectAsState()
    val profiles by viewModel.profiles.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val uniqueSongs by viewModel.uniqueSongs.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val sortOption by viewModel.sortOption.collectAsState()
    val reactedIds by viewModel.reactedLyricIds.collectAsState()
    val reactionDeltas by viewModel.reactionCountDeltas.collectAsState()
    val follows by viewModel.followManager.follows.collectAsState()
    val haptics = rememberHaptics()
    val context = LocalContext.current
    var reportLyricId by remember { mutableStateOf<String?>(null) }
    var showPageShareSheet by remember { mutableStateOf(false) }

    val isFollowing = follows.any { it.filterType == "artist" && it.filterValue.equals(artistName, ignoreCase = true) }

    LaunchedEffect(artistName) {
        viewModel.loadArtist(artistName)
    }

    // Page share sheet
    if (showPageShareSheet) {
        val statsLine = buildList {
            add("${formatCompact(stats.totalSaves)} saves")
            add("${formatCompact(stats.uniqueSavers)} savers")
            add("${formatCompact(stats.songCount)} songs")
        }.joinToString(" · ")

        PageShareSheet(
            pageType = "artist",
            title = artistName,
            statsLine = statsLine,
            onDismiss = { showPageShareSheet = false }
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        TopAppBar(
            title = { },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, "Back", tint = Theme.textPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
        )

        if (isLoading && lyrics.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Theme.accent)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                // Header
                item {
                    ArtistHeader(
                        artistName = artistName,
                        coverArtUrl = lyrics.firstOrNull()?.coverArtUrl,
                        isFollowing = isFollowing,
                        onFollowToggle = { viewModel.toggleFollow(artistName) },
                        onShareClick = { showPageShareSheet = true }
                    )
                }

                // Stats Row
                item {
                    PageStatsRow(
                        stats = listOf(
                            "saves" to formatCompact(stats.totalSaves),
                            "savers" to formatCompact(stats.uniqueSavers),
                            "songs" to formatCompact(stats.songCount),
                            "resonates" to formatCompact(stats.reactionsCount),
                            "comments" to formatCompact(stats.commentsCount)
                        )
                    )
                }

                // Songs Section
                if (uniqueSongs.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Songs",
                            style = Theme.dmSans(16f, FontWeight.SemiBold),
                            color = Theme.textPrimary,
                            modifier = Modifier.padding(horizontal = 16.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(uniqueSongs, key = { it.songTitle }) { song ->
                                SongThumbnailCard(
                                    song = song,
                                    artistName = artistName,
                                    onClick = {
                                        navController.navigate(
                                            Screen.SongPage.createRoute(song.songTitle, artistName)
                                        )
                                    }
                                )
                            }
                        }
                    }
                }

                // Most Saved
                item {
                    MostSavedSection(
                        lyrics = lyrics,
                        onArtistClick = { artist ->
                            navController.navigate(Screen.ArtistPage.createRoute(artist))
                        },
                        onSongClick = { title, artist ->
                            navController.navigate(Screen.SongPage.createRoute(title, artist ?: artistName))
                        }
                    )
                }

                // Search & Sort
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    SearchAndSortBar(
                        searchQuery = searchQuery,
                        sortOption = sortOption,
                        onSearchChange = { viewModel.setSearchQuery(it) },
                        onSortChange = { viewModel.setSortOption(it) }
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Lyrics Feed
                items(lyrics, key = { it.id }) { lyric ->
                    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                        ExploreLyricCard(
                            lyric = lyric,
                            profile = profiles[lyric.userId],
                            navController = navController,
                            hasReacted = lyric.id in reactedIds,
                            reactionCount = (lyric.reactionCount ?: 0) + (reactionDeltas[lyric.id] ?: 0),
                            onReactionToggle = { haptics.light(); viewModel.toggleReaction(lyric.id) },
                            onShareClick = { /* TODO */ },
                            onReportClick = { reportLyricId = lyric.id }
                        )
                    }
                }

                if (lyrics.isEmpty() && !isLoading) {
                    item {
                        Text(
                            text = "No earwyrms found for this artist",
                            style = Theme.dmSans(14f),
                            color = Theme.textMuted,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ArtistHeader(
    artistName: String,
    coverArtUrl: String?,
    isFollowing: Boolean,
    onFollowToggle: () -> Unit,
    onShareClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Cover art circle
        if (coverArtUrl != null) {
            AsyncImage(
                model = coverArtUrl,
                contentDescription = artistName,
                modifier = Modifier
                    .size(100.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
        } else {
            // Initial letter fallback
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .clip(CircleShape)
                    .background(Theme.accent.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = artistName.firstOrNull()?.uppercase() ?: "?",
                    fontFamily = CaveatFamily,
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                    color = Theme.accent
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Artist name
        Text(
            text = artistName,
            fontFamily = CaveatFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = Theme.textPrimary,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Follow + Share buttons
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = onFollowToggle,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isFollowing) Theme.card else Theme.accent
                ),
                shape = RoundedCornerShape(20.dp)
            ) {
                Text(
                    text = if (isFollowing) "following" else "follow",
                    style = Theme.dmSans(14f, FontWeight.Medium),
                    color = if (isFollowing) Theme.textSecondary else Color.White
                )
            }

            IconButton(onClick = onShareClick) {
                Icon(
                    Icons.Default.Share,
                    contentDescription = "Share",
                    tint = Theme.textMuted,
                    modifier = Modifier.size(22.dp)
                )
            }
        }
    }
}

@Composable
private fun SongThumbnailCard(
    song: ArtistSong,
    artistName: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(120.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            if (song.coverArtUrl != null) {
                AsyncImage(
                    model = song.coverArtUrl,
                    contentDescription = song.songTitle,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .background(
                            Theme.accent.copy(alpha = 0.1f),
                            RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = song.songTitle.firstOrNull()?.uppercase() ?: "?",
                        fontFamily = CaveatFamily,
                        fontSize = 32.sp,
                        color = Theme.accent
                    )
                }
            }
            Column(modifier = Modifier.padding(8.dp)) {
                Text(
                    text = song.songTitle,
                    style = Theme.dmSans(12f, FontWeight.Medium),
                    color = Theme.textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${song.saveCount} save${if (song.saveCount != 1) "s" else ""}",
                    style = Theme.dmSans(10f),
                    color = Theme.textMuted
                )
            }
        }
    }
}

@Composable
private fun SearchAndSortBar(
    searchQuery: String,
    sortOption: ArtistSortOption,
    onSearchChange: (String) -> Unit,
    onSortChange: (ArtistSortOption) -> Unit
) {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            placeholder = {
                Text(
                    "Search lyrics...",
                    style = Theme.dmSans(14f),
                    color = Theme.textMuted
                )
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Theme.accent,
                unfocusedBorderColor = Theme.divider,
                cursorColor = Theme.accent,
                focusedTextColor = Theme.textPrimary,
                unfocusedTextColor = Theme.textPrimary
            ),
            textStyle = Theme.dmSans(14f),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Sort options
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            var showSortMenu by remember { mutableStateOf(false) }
            Box {
                TextButton(onClick = { showSortMenu = true }) {
                    Text(
                        text = "Sort: ${sortOption.label}",
                        style = Theme.dmSans(13f, FontWeight.Medium),
                        color = Theme.accent
                    )
                }
                DropdownMenu(
                    expanded = showSortMenu,
                    onDismissRequest = { showSortMenu = false }
                ) {
                    ArtistSortOption.entries.forEach { option ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    option.label,
                                    style = Theme.dmSans(14f),
                                    color = if (option == sortOption) Theme.accent else Theme.textPrimary
                                )
                            },
                            onClick = {
                                onSortChange(option)
                                showSortMenu = false
                            }
                        )
                    }
                }
            }
        }
    }
}
