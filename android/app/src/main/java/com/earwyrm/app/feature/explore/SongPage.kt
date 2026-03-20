package com.earwyrm.app.feature.explore

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.Profile
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.feature.share.PageShareSheet
import com.earwyrm.app.feature.share.ReportSheet
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SongPage(
    title: String,
    artist: String?,
    navController: NavHostController
) {
    var lyrics by remember { mutableStateOf<List<Lyric>>(emptyList()) }
    var profiles by remember { mutableStateOf<Map<String, Profile>>(emptyMap()) }
    var coverArtUrl by remember { mutableStateOf<String?>(null) }
    var reportLyricId by remember { mutableStateOf<String?>(null) }
    var showPageShareSheet by remember { mutableStateOf(false) }

    // Use hilt to get supabase client
    val viewModel: SongPageViewModel = hiltViewModel()
    val scope = rememberCoroutineScope()

    LaunchedEffect(title, artist) {
        scope.launch {
            val result = viewModel.fetchSongLyrics(title, artist)
            lyrics = result.first
            profiles = result.second
            coverArtUrl = result.first.firstOrNull()?.coverArtUrl
        }
    }

    // Page share sheet
    if (showPageShareSheet) {
        val statsLine = buildList {
            add("${formatStatValue(lyrics.size)} saves")
            val uniqueUsers = lyrics.map { it.userId }.distinct().size
            if (uniqueUsers > 1) add("$uniqueUsers people")
            val totalResonates = lyrics.sumOf { it.reactionCount ?: 0 }
            if (totalResonates > 0) add("$totalResonates resonates")
        }.joinToString(" · ")

        PageShareSheet(
            pageType = "song",
            title = title,
            subtitle = artist,
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

    Box(modifier = Modifier.fillMaxSize()) {
        // Blurred cover art background
        SongBackgroundView(
            coverArtUrl = coverArtUrl,
            modifier = Modifier.align(Alignment.TopCenter)
        )

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

        // Song header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (coverArtUrl != null) {
                AsyncImage(
                    model = coverArtUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(16.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = Theme.dmSans(22f, FontWeight.Bold),
                    color = Theme.textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (artist != null) {
                    Text(
                        text = artist,
                        style = Theme.dmSans(16f),
                        color = Theme.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            IconButton(onClick = { showPageShareSheet = true }) {
                Icon(
                    Icons.Default.Share,
                    contentDescription = "Share",
                    tint = Theme.textMuted,
                    modifier = Modifier.size(22.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Stats Row
        PageStatsRow(
            stats = buildList {
                add("saves" to formatStatValue(lyrics.size))
                val uniqueUsers = lyrics.map { it.userId }.distinct().size
                if (uniqueUsers > 1) add("people" to formatStatValue(uniqueUsers))
                val totalResonates = lyrics.sumOf { it.reactionCount ?: 0 }
                add("resonates" to formatStatValue(totalResonates))
                val totalComments = lyrics.sumOf { it.commentCount ?: 0 }
                if (totalComments > 0) add("comments" to formatStatValue(totalComments))
            }
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Most Saved
        MostSavedSection(
            lyrics = lyrics,
            onArtistClick = { artistName ->
                navController.navigate(Screen.ArtistPage.createRoute(artistName))
            },
            onSongClick = { songTitle, songArtist ->
                navController.navigate(Screen.SongPage.createRoute(songTitle, songArtist))
            }
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Browse Full Lyrics button
        OutlinedButton(
            onClick = {
                navController.navigate(Screen.FullLyrics.createRoute(title, artist))
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, Theme.accent.copy(alpha = 0.4f)),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = Theme.accent
            )
        ) {
            Text(
                text = "browse full lyrics",
                style = Theme.dmSans(14f, FontWeight.Medium),
                color = Theme.accent
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(lyrics, key = { it.id }) { lyric ->
                ExploreLyricCard(
                    lyric = lyric,
                    profile = profiles[lyric.userId],
                    navController = navController,
                    onReportClick = { reportLyricId = lyric.id }
                )
            }
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
    } // end Box
}
