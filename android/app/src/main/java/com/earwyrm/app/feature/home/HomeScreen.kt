package com.earwyrm.app.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.feature.collections.CollectionPickerSheet
import com.earwyrm.app.feature.share.ShareSheet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavHostController, viewModel: HomeViewModel = hiltViewModel()) {
    val currentLyric by viewModel.currentLyric.collectAsState()
    val pastLyrics by viewModel.pastLyrics.collectAsState()
    val currentNote by viewModel.currentNote.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val hasReacted by viewModel.hasReacted.collectAsState()
    val reactionCount by viewModel.reactionCount.collectAsState()
    val comments by viewModel.comments.collectAsState()
    val commentProfiles by viewModel.commentProfiles.collectAsState()
    val profile by viewModel.profile.collectAsState()
    var showEditSheet by remember { mutableStateOf(false) }
    var showSaveSheet by remember { mutableStateOf(false) }
    var showShareSheet by remember { mutableStateOf(false) }

    if (showEditSheet && currentLyric != null) {
        EditLyricSheet(lyric = currentLyric!!, onDismiss = { showEditSheet = false }, onSave = { newContent -> viewModel.updateLyric(newContent); showEditSheet = false })
    }

    if (showShareSheet && currentLyric != null) {
        ShareSheet(lyric = currentLyric!!, onDismiss = { showShareSheet = false }, onShared = { viewModel.sendShareNotification(currentLyric!!) })
    }

    if (showSaveSheet && currentLyric != null && profile != null) {
        LaunchedEffect(Unit) { viewModel.collectionManager.fetchCollections(profile!!.id) }
        CollectionPickerSheet(lyricId = currentLyric!!.id, userId = profile!!.id, collectionManager = viewModel.collectionManager, onDismiss = { showSaveSheet = false })
    }

    Box(modifier = Modifier.fillMaxSize()) {
        PullToRefreshBox(isRefreshing = isLoading, onRefresh = { viewModel.loadData() }, modifier = Modifier.fillMaxSize()) {
        LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 16.dp, bottom = 100.dp, start = 16.dp, end = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item { Text("earwyrm", fontFamily = CaveatFamily, fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Theme.accent, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) }
                if (currentLyric != null) {
                    item { LyricCardView(lyric = currentLyric!!, note = currentNote, isCurrent = true, hasReacted = hasReacted, reactionCount = reactionCount, onReactionToggle = { viewModel.toggleReaction() }, onVisibilityToggle = { viewModel.toggleVisibility() }, onCommentClick = { }, onShareClick = { showShareSheet = true }, onEditClick = { showEditSheet = true }, onSaveClick = { showSaveSheet = true }, navController = navController) }
                    item { CommentSection(comments = comments, profiles = commentProfiles, currentUserId = profile?.id, onSubmitComment = { c, p -> viewModel.submitComment(c, p) }, onDeleteComment = { viewModel.deleteComment(it) }) }
                    item { NoteEditor(note = currentNote, onSave = { c, p -> viewModel.saveNote(c, p) }) }
                } else {
                    item { Column(modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text("what's stuck in your head?", fontFamily = CaveatFamily, fontSize = 28.sp, fontWeight = FontWeight.Medium, color = Theme.textSecondary, textAlign = TextAlign.Center); Spacer(Modifier.height(8.dp)); Text("Tap + to post your first earwyrm", style = Theme.dmSans(14f), color = Theme.textMuted) } }
                }
                if (pastLyrics.isNotEmpty()) {
                    item { Spacer(Modifier.height(8.dp)); Text("past earwyrms", style = Theme.dmSans(14f, FontWeight.SemiBold), color = Theme.textSecondary) }
                    items(pastLyrics, key = { it.id }) { lyric -> LyricCardView(lyric = lyric, note = null, isCurrent = false, hasReacted = false, reactionCount = lyric.reactionCount ?: 0, onReactionToggle = {}, onVisibilityToggle = {}, onCommentClick = {}, onShareClick = {}, navController = navController) }
                }
            }
        }
        FloatingActionButton(onClick = { navController.navigate(Screen.PostLyric.route) }, modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 80.dp), containerColor = Theme.accent, contentColor = Color.White) { Icon(Icons.Default.Add, "Post lyric") }
    }
}
