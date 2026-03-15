package com.earwyrm.app.feature.postlyric

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme

private val ghostTextPrompts = listOf(
    "what lyric is stuck in your head?",
    "the words that won't leave...",
    "that line that hits different...",
    "sing it out, even if it's off-key...",
    "the melody you can't shake...",
    "what's playing on repeat in your mind?",
    "that verse you keep coming back to...",
    "the lyric that found you today...",
    "what's echoing in your head?",
    "the words that won't stop playing..."
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostLyricScreen(navController: NavHostController, viewModel: PostLyricViewModel = hiltViewModel()) {
    val content by viewModel.content.collectAsState(); val artistName by viewModel.artistName.collectAsState(); val songTitle by viewModel.songTitle.collectAsState()
    val tags by viewModel.tags.collectAsState(); val noteContent by viewModel.noteContent.collectAsState(); val isPublic by viewModel.isPublic.collectAsState()
    val isSaving by viewModel.isSaving.collectAsState(); val saveSuccess by viewModel.saveSuccess.collectAsState()
    val artistSuggestions by viewModel.artistSuggestions.collectAsState(); val songSuggestions by viewModel.songSuggestions.collectAsState()
    val geniusSuggestions by viewModel.geniusSuggestions.collectAsState()
    val isSearchingGenius by viewModel.isSearchingGenius.collectAsState()
    LaunchedEffect(saveSuccess) { if (saveSuccess) navController.popBackStack() }

    Column(Modifier.fillMaxSize().padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())) {
        TopAppBar(title = { Text("new earwyrm", fontFamily = CaveatFamily, fontWeight = FontWeight.Bold, color = Theme.accent) }, navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.Default.ArrowBack, "Back", tint = Theme.textPrimary) } }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent))
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp)) {
            val ghostText = remember { ghostTextPrompts.random() }
            Box {
                OutlinedTextField(value = content, onValueChange = { viewModel.onContentChanged(it) }, modifier = Modifier.fillMaxWidth(), textStyle = Theme.caveat(22f), minLines = 3, maxLines = 8, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Theme.accent, cursorColor = Theme.accent), shape = RoundedCornerShape(12.dp))
                androidx.compose.animation.AnimatedVisibility(visible = content.isEmpty(), enter = fadeIn(), exit = fadeOut()) {
                    Text(
                        text = ghostText,
                        style = Theme.caveat(22f).copy(
                            fontWeight = FontWeight.Medium,
                            color = Theme.textMuted.copy(alpha = 0.45f)
                        ),
                        modifier = Modifier.padding(start = 16.dp, top = 16.dp)
                    )
                }
            }
            Text("${content.length}/500", style = Theme.dmSans(11f), color = Theme.textMuted, modifier = Modifier.align(Alignment.End).padding(top = 4.dp))
            // Genius suggest matches section
            AnimatedVisibility(
                visible = isSearchingGenius && geniusSuggestions.isEmpty(),
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Row(
                    modifier = Modifier.padding(top = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        color = Theme.textMuted,
                        strokeWidth = 1.5.dp
                    )
                    Spacer(Modifier.width(8.dp))
                    Text("finding matches...", style = Theme.dmSans(12f), color = Theme.textMuted)
                }
            }
            AnimatedVisibility(
                visible = geniusSuggestions.isNotEmpty(),
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .padding(top = 10.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(
                            width = 1.dp,
                            color = Theme.accent.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(12.dp)
                ) {
                    Text(
                        "Is this from...",
                        style = Theme.dmSans(12f),
                        color = Theme.textMuted,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                    geniusSuggestions.forEach { suggestion ->
                        GeniusSuggestionChip(suggestion) {
                            viewModel.selectGeniusSuggestion(suggestion)
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp)); ArtistAutocomplete(artistName, { viewModel.onArtistChanged(it) }, artistSuggestions, { viewModel.selectArtist(it) })
            Spacer(Modifier.height(12.dp)); SongAutocomplete(songTitle, { viewModel.onSongTitleChanged(it) }, songSuggestions, { viewModel.selectSong(it) })
            Spacer(Modifier.height(12.dp)); TagInput(tags, { viewModel.addTag(it) }, { viewModel.removeTag(it) })
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(value = noteContent, onValueChange = { if (it.length <= 500) viewModel.noteContent.value = it }, placeholder = { Text("Why is this stuck in your head?", style = Theme.dmSansItalic(14f)) }, modifier = Modifier.fillMaxWidth(), textStyle = Theme.dmSansItalic(14f), minLines = 2, maxLines = 4, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Theme.accent, cursorColor = Theme.accent), shape = RoundedCornerShape(12.dp))
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) { Text("Public", style = Theme.dmSans(14f), color = Theme.textSecondary); Switch(checked = isPublic, onCheckedChange = { viewModel.isPublic.value = it }, colors = SwitchDefaults.colors(checkedTrackColor = Theme.accent), modifier = Modifier.padding(start = 8.dp)) }
            Spacer(Modifier.height(24.dp))
            Button(onClick = { viewModel.save() }, Modifier.fillMaxWidth().height(50.dp), enabled = content.isNotBlank() && !isSaving, colors = ButtonDefaults.buttonColors(containerColor = Theme.accent, contentColor = Color.White), shape = RoundedCornerShape(12.dp)) { if (isSaving) CircularProgressIndicator(color = Color.White, modifier = Modifier.height(20.dp)) else Text("Post", style = Theme.dmSans(16f, FontWeight.SemiBold)) }
            Spacer(Modifier.height(32.dp))
        }
    }
}
