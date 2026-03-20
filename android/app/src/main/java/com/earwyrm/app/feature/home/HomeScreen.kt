package com.earwyrm.app.feature.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.EaseOutBack
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.WifiOff
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.feature.artgallery.ArtGalleryViewModel
import com.earwyrm.app.feature.collections.CollectionPickerSheet
import com.earwyrm.app.feature.share.ShareSheet
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavHostController, viewModel: HomeViewModel = hiltViewModel(), artGalleryViewModel: ArtGalleryViewModel = hiltViewModel()) {
    val currentLyric by viewModel.currentLyric.collectAsState()
    val pastLyrics by viewModel.pastLyrics.collectAsState()
    val currentNote by viewModel.currentNote.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val hasReacted by viewModel.hasReacted.collectAsState()
    val reactionCount by viewModel.reactionCount.collectAsState()
    val comments by viewModel.comments.collectAsState()
    val commentProfiles by viewModel.commentProfiles.collectAsState()
    val profile by viewModel.profile.collectAsState()
    val collections by viewModel.collectionManager.collections.collectAsState()
    val isOnline by viewModel.networkMonitor.isOnline.collectAsState()
    val isPlus by viewModel.billingManager.isPlusSubscriber.collectAsState()
    var showEditSheet by remember { mutableStateOf(false) }
    var showSaveSheet by remember { mutableStateOf(false) }
    var showShareSheet by remember { mutableStateOf(false) }
    val haptics = rememberHaptics()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Header fade-in animation
    var headerVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { headerVisible = true }
    val headerAlpha by animateFloatAsState(
        targetValue = if (headerVisible) 1f else 0f,
        animationSpec = tween(durationMillis = 800),
        label = "headerAlpha"
    )

    if (showEditSheet && currentLyric != null) {
        EditLyricSheet(
            lyric = currentLyric!!,
            onDismiss = { showEditSheet = false },
            onSave = { newContent -> viewModel.updateLyric(newContent); showEditSheet = false },
            artGalleryViewModel = artGalleryViewModel,
            isPlus = isPlus,
            noteContent = currentNote?.content ?: "",
            onNavigateToPaywall = { navController.navigate(Screen.PlusPaywall.route) }
        )
    }

    if (showShareSheet && currentLyric != null) {
        ShareSheet(lyric = currentLyric!!, onDismiss = { showShareSheet = false }, onShared = { viewModel.sendShareNotification(currentLyric!!); haptics.success(); scope.launch { snackbarHostState.showSnackbar("Copied link") } })
    }

    if (showSaveSheet && currentLyric != null && profile != null) {
        LaunchedEffect(Unit) { viewModel.collectionManager.fetchCollections(profile!!.id) }
        CollectionPickerSheet(lyricId = currentLyric!!.id, userId = profile!!.id, collectionManager = viewModel.collectionManager, onDismiss = { showSaveSheet = false }, onSaved = { haptics.light(); scope.launch { snackbarHostState.showSnackbar("Saved to collection") } })
    }

    Box(modifier = Modifier.fillMaxSize()) {
        PullToRefreshBox(isRefreshing = isLoading, onRefresh = { haptics.light(); viewModel.loadData() }, modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 16.dp,
                    bottom = 100.dp
                ),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header with fade-in animation
                item {
                    Text(
                        "earwyrm",
                        fontFamily = CaveatFamily,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = Theme.accent,
                        modifier = Modifier
                            .fillMaxWidth()
                            .graphicsLayer { alpha = headerAlpha },
                        textAlign = TextAlign.Center
                    )
                }

                if (currentLyric != null) {
                    // Current lyric card
                    item {
                        Box(Modifier.padding(horizontal = 16.dp)) {
                            LyricCardView(
                                lyric = currentLyric!!,
                                note = currentNote,
                                isCurrent = true,
                                hasReacted = hasReacted,
                                reactionCount = reactionCount,
                                onReactionToggle = { haptics.light(); viewModel.toggleReaction() },
                                onVisibilityToggle = { viewModel.toggleVisibility() },
                                onCommentClick = { },
                                onShareClick = { showShareSheet = true },
                                onEditClick = { showEditSheet = true },
                                onSaveClick = { haptics.light(); showSaveSheet = true },
                                navController = navController
                            )
                        }
                    }
                    item {
                        Box(Modifier.padding(horizontal = 16.dp)) {
                            CommentSection(
                                comments = comments,
                                profiles = commentProfiles,
                                currentUserId = profile?.id,
                                onSubmitComment = { c, p -> viewModel.submitComment(c, p) },
                                onDeleteComment = { viewModel.deleteComment(it) }
                            )
                        }
                    }
                    item {
                        Box(Modifier.padding(horizontal = 16.dp)) {
                            NoteEditor(
                                note = currentNote,
                                onSave = { c, p -> viewModel.saveNote(c, p) }
                            )
                        }
                    }

                    // Past earwyrms section
                    if (pastLyrics.isNotEmpty()) {
                        item {
                            Column {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "past earwyrms",
                                    fontFamily = CaveatFamily,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Theme.textSecondary,
                                    modifier = Modifier.padding(horizontal = 16.dp)
                                )
                            }
                        }
                        items(pastLyrics, key = { it.id }) { lyric ->
                            Box(Modifier.padding(horizontal = 16.dp)) {
                                LyricCardView(
                                    lyric = lyric,
                                    note = null,
                                    isCurrent = false,
                                    hasReacted = false,
                                    reactionCount = lyric.reactionCount ?: 0,
                                    onReactionToggle = {},
                                    onVisibilityToggle = {},
                                    onCommentClick = {},
                                    onShareClick = {},
                                    navController = navController
                                )
                            }
                        }
                    }

                    // Collections carousel (when user has content)
                    if (collections.isNotEmpty()) {
                        item {
                            CollectionsCarousel(
                                collections = collections,
                                navController = navController
                            )
                        }
                    }
                } else {
                    // Empty state
                    item {
                        EmptyStateContent(
                            isOnline = isOnline,
                            onPostClick = {
                                haptics.light()
                                navController.navigate(Screen.PostLyric.route)
                            }
                        )
                    }

                    // Collections carousel in empty state too
                    if (collections.isNotEmpty()) {
                        item {
                            CollectionsCarousel(
                                collections = collections,
                                navController = navController
                            )
                        }
                    }
                }
            }
        }

        // FAB
        FloatingActionButton(
            onClick = { navController.navigate(Screen.PostLyric.route) },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 16.dp, bottom = 80.dp),
            containerColor = Theme.accent,
            contentColor = Color.White,
            shape = CircleShape
        ) {
            Icon(Icons.Default.Add, "Post lyric")
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 80.dp)
        )
    }
}

@Composable
private fun EmptyStateContent(
    isOnline: Boolean,
    onPostClick: () -> Unit
) {
    // Staggered fade-in for the empty state elements
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    val contentAlpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(durationMillis = 600, delayMillis = 200),
        label = "emptyAlpha"
    )

    val iconScale by animateFloatAsState(
        targetValue = if (visible) 1f else 0.3f,
        animationSpec = tween(durationMillis = 500, delayMillis = 400, easing = EaseOutBack),
        label = "iconScale"
    )

    // Gentle pulse on the icon
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp)
            .graphicsLayer { alpha = contentAlpha },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            "what's stuck in your head?",
            fontFamily = CaveatFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.Medium,
            color = Theme.textSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(12.dp))

        Text(
            "Tap below to post your first earwyrm",
            style = Theme.dmSans(14f),
            color = Theme.textMuted,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(20.dp))

        // Tappable plus icon with bounce animation
        Surface(
            onClick = onPostClick,
            modifier = Modifier
                .scale(iconScale * pulseScale),
            shape = CircleShape,
            color = Theme.accent,
            shadowElevation = 4.dp
        ) {
            Icon(
                Icons.Default.Add,
                contentDescription = "Post your first lyric",
                tint = Color.White,
                modifier = Modifier.padding(14.dp)
            )
        }

        Spacer(Modifier.height(8.dp))

        Text(
            "post a lyric",
            style = Theme.dmSans(13f, FontWeight.Medium),
            color = Theme.accent
        )

        // Offline note
        if (!isOnline) {
            Spacer(Modifier.height(24.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    Icons.Outlined.WifiOff,
                    contentDescription = null,
                    tint = Theme.textMuted,
                    modifier = Modifier.size(14.dp)
                )
                Text(
                    "You're offline. Connect to post.",
                    style = Theme.dmSans(13f),
                    color = Theme.textMuted
                )
            }
        }
    }
}

@Composable
private fun CollectionsCarousel(
    collections: List<com.earwyrm.app.core.model.EarwyrmCollection>,
    navController: NavHostController
) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(500, delayMillis = 350)) + slideInVertically(
            initialOffsetY = { it / 4 },
            animationSpec = tween(500, delayMillis = 350)
        )
    ) {
        Column(
            modifier = Modifier.padding(top = 8.dp)
        ) {
            Text(
                "collections",
                fontFamily = CaveatFamily,
                fontSize = 24.sp,
                fontWeight = FontWeight.Medium,
                color = Theme.textSecondary,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(Modifier.height(8.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(collections, key = { it.id }) { collection ->
                    Card(
                        modifier = Modifier
                            .width(140.dp)
                            .clickable {
                                navController.navigate(
                                    Screen.CollectionDetail.createRoute(collection.id)
                                )
                            },
                        colors = CardDefaults.cardColors(containerColor = Theme.card),
                        shape = RoundedCornerShape(12.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp)
                        ) {
                            Text(
                                text = collection.name,
                                style = Theme.dmSans(14f, FontWeight.SemiBold),
                                color = Theme.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (collection.description != null) {
                                Text(
                                    text = collection.description,
                                    style = Theme.dmSans(11f),
                                    color = Theme.textMuted,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                            if (collection.isSmart == true) {
                                Text(
                                    text = "#${collection.smartTag}",
                                    style = Theme.dmSans(11f),
                                    color = Theme.accent,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
