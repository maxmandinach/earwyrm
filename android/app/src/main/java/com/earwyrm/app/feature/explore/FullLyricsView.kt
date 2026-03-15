package com.earwyrm.app.feature.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.navigation.NavHostController
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.DmSansFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.network.LRCLIBService
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import javax.inject.Inject

@HiltViewModel
class FullLyricsViewModel @Inject constructor(
    val lrclibService: LRCLIBService,
    private val supabase: SupabaseClient
) : ViewModel() {

    suspend fun fetchFullLyrics(title: String, artist: String): String? {
        return lrclibService.getLyrics(title, artist)
    }

    suspend fun fetchSavedLyricContents(title: String, artist: String?): List<String> {
        return try {
            supabase.postgrest.from("lyrics")
                .select {
                    filter {
                        eq("is_public", true)
                        eq("song_title", title)
                        if (artist != null) eq("artist_name", artist)
                    }
                }
                .decodeList<Lyric>()
                .map { it.content }
        } catch (_: Exception) {
            emptyList()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FullLyricsView(
    songTitle: String,
    artistName: String?,
    navController: NavHostController
) {
    val viewModel: FullLyricsViewModel = hiltViewModel()
    var lyrics by remember { mutableStateOf<String?>(null) }
    var savedContents by remember { mutableStateOf<List<String>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(songTitle, artistName) {
        if (!artistName.isNullOrBlank()) {
            lyrics = viewModel.fetchFullLyrics(songTitle, artistName)
            savedContents = viewModel.fetchSavedLyricContents(songTitle, artistName)
        }
        isLoading = false
    }

    // Pre-compute highlighted lines like iOS
    val highlightedLines = remember(lyrics, savedContents) {
        val fullLines = lyrics?.split("\n") ?: return@remember emptySet<Int>()
        val savedNormalized = savedContents.map { normalize(it) }
        if (savedNormalized.isEmpty()) return@remember emptySet<Int>()
        val highlighted = mutableSetOf<Int>()
        for ((index, line) in fullLines.withIndex()) {
            val normalizedLine = normalize(line)
            if (normalizedLine.length < 3) continue
            for (saved in savedNormalized) {
                if (saved.contains(normalizedLine) || normalizedLine.contains(saved)) {
                    highlighted.add(index)
                    break
                }
            }
        }
        highlighted
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        TopAppBar(
            title = {
                Column {
                    Text(
                        songTitle,
                        style = Theme.dmSans(16f, FontWeight.SemiBold),
                        color = Theme.textPrimary,
                        maxLines = 1
                    )
                    if (!artistName.isNullOrBlank()) {
                        Text(
                            artistName,
                            style = Theme.dmSans(13f),
                            color = Theme.textSecondary,
                            maxLines = 1
                        )
                    }
                }
            },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, "Back", tint = Theme.textPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
        )

        if (isLoading) {
            // Skeleton loading state
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp)
            ) {
                repeat(8) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction = if (it % 3 == 2) 0.6f else 0.9f)
                            .height(16.dp)
                            .padding(vertical = 2.dp)
                            .background(
                                Theme.textMuted.copy(alpha = 0.15f),
                                RoundedCornerShape(4.dp)
                            )
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        } else if (lyrics != null) {
            val lines = lyrics!!.split("\n")
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                lines.forEachIndexed { index, line ->
                    val isHighlighted = highlightedLines.contains(index)
                    val isEmpty = line.trim().isEmpty()

                    if (isEmpty) {
                        Spacer(modifier = Modifier.height(16.dp))
                    } else {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(IntrinsicSize.Min)
                                .background(
                                    if (isHighlighted) Theme.accent.copy(alpha = 0.12f)
                                    else Color.Transparent
                                )
                        ) {
                            // Left accent bar for highlighted lines
                            if (isHighlighted) {
                                Box(
                                    modifier = Modifier
                                        .width(2.dp)
                                        .fillMaxHeight()
                                        .background(Theme.accent)
                                )
                            }
                            Text(
                                text = line,
                                fontFamily = CaveatFamily,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Medium,
                                color = if (isHighlighted) Theme.textPrimary else Theme.textSecondary,
                                lineHeight = 28.sp,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp, horizontal = 8.dp)
                            )
                        }
                    }
                }

                // Attribution footer
                Spacer(modifier = Modifier.height(24.dp))
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row {
                        Text(
                            "lyrics from ",
                            fontFamily = DmSansFamily,
                            fontSize = 11.sp,
                            color = Theme.textMuted
                        )
                        Text(
                            "lrclib",
                            fontFamily = DmSansFamily,
                            fontSize = 11.sp,
                            color = Theme.accent
                        )
                    }
                    Text(
                        "issue with these lyrics?",
                        fontFamily = DmSansFamily,
                        fontSize = 10.sp,
                        color = Theme.textMuted.copy(alpha = 0.6f),
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                Spacer(modifier = Modifier.height(80.dp))
            }
        } else {
            // Empty / error state
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    "lyrics not available",
                    fontFamily = CaveatFamily,
                    fontSize = 22.sp,
                    color = Theme.textSecondary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "we couldn't find full lyrics for this song",
                    fontFamily = DmSansFamily,
                    fontSize = 14.sp,
                    color = Theme.textMuted
                )
            }
        }
    }
}

private fun normalize(text: String): String =
    text.lowercase()
        .replace(Regex("[^a-z0-9\\s]"), "")
        .replace(Regex("\\s+"), " ")
        .trim()
