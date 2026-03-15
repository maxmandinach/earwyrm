package com.earwyrm.app.feature.profile

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
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.PlusBadge
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.EarwyrmCollection
import com.earwyrm.app.core.model.Follow
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.LyricNote
import com.earwyrm.app.core.model.Profile
import com.earwyrm.app.core.model.Reaction
import com.earwyrm.app.core.model.UserFollow
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.core.supabase.BlockManager
import com.earwyrm.app.core.supabase.CollectionManager
import com.earwyrm.app.core.supabase.FollowManager
import com.earwyrm.app.feature.explore.ExploreLyricCard
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    val authManager: AuthManager,
    private val followManager: FollowManager,
    private val collectionManager: CollectionManager,
    private val blockManager: BlockManager
) : ViewModel() {

    private val _viewingProfile = MutableStateFlow<Profile?>(null)
    val viewingProfile: StateFlow<Profile?> = _viewingProfile.asStateFlow()

    private val _userLyrics = MutableStateFlow<List<Lyric>>(emptyList())
    val userLyrics: StateFlow<List<Lyric>> = _userLyrics.asStateFlow()

    private val _resonatedLyrics = MutableStateFlow<List<Lyric>>(emptyList())
    val resonatedLyrics: StateFlow<List<Lyric>> = _resonatedLyrics.asStateFlow()

    private val _publicNotes = MutableStateFlow<List<LyricNote>>(emptyList())
    val publicNotes: StateFlow<List<LyricNote>> = _publicNotes.asStateFlow()

    val collections: StateFlow<List<EarwyrmCollection>> = collectionManager.collections

    private val _follows = MutableStateFlow<List<Follow>>(emptyList())
    val follows: StateFlow<List<Follow>> = _follows.asStateFlow()

    private val _followerCount = MutableStateFlow(0)
    val followerCount: StateFlow<Int> = _followerCount.asStateFlow()

    private val _followingCount = MutableStateFlow(0)
    val followingCount: StateFlow<Int> = _followingCount.asStateFlow()

    suspend fun loadProfile(username: String?) {
        if (username == null) {
            _viewingProfile.value = authManager.profile.value
            val userId = authManager.userId ?: return
            fetchLyrics(userId, isOwn = true)
            fetchResonatedLyrics(userId)
            fetchPublicNotes(userId)
            collectionManager.fetchCollections(userId)
            fetchFollows(userId)
            fetchFollowCounts(userId)
        } else {
            try {
                val profile = supabase.postgrest.from("profiles")
                    .select { filter { eq("username", username) } }
                    .decodeList<Profile>()
                    .firstOrNull()
                _viewingProfile.value = profile
                if (profile != null) {
                    fetchLyrics(profile.id, isOwn = false)
                    fetchFollowCounts(profile.id)
                }
            } catch (_: Exception) { }
        }
    }

    private suspend fun fetchLyrics(userId: String, isOwn: Boolean) {
        try {
            val result = supabase.postgrest.from("lyrics")
                .select {
                    filter {
                        eq("user_id", userId)
                        if (!isOwn) eq("is_public", true)
                    }
                    order("created_at", Order.DESCENDING)
                }
                .decodeList<Lyric>()
            _userLyrics.value = result
        } catch (_: Exception) { }
    }

    private suspend fun fetchResonatedLyrics(userId: String) {
        try {
            val reactions = supabase.postgrest.from("reactions")
                .select { filter { eq("user_id", userId) }; order("created_at", Order.DESCENDING) }
                .decodeList<Reaction>()
            if (reactions.isNotEmpty()) {
                val lyricIds = reactions.map { it.lyricId }
                val lyrics = supabase.postgrest.from("lyrics")
                    .select { filter { isIn("id", lyricIds) } }
                    .decodeList<Lyric>()
                _resonatedLyrics.value = lyrics.sortedByDescending { lyric ->
                    reactions.indexOfFirst { it.lyricId == lyric.id }.let { if (it == -1) Int.MAX_VALUE else it }
                }
            }
        } catch (_: Exception) { }
    }

    private suspend fun fetchPublicNotes(userId: String) {
        try {
            _publicNotes.value = supabase.postgrest.from("lyric_notes")
                .select { filter { eq("user_id", userId); eq("is_public", true) }; order("created_at", Order.DESCENDING) }
                .decodeList()
        } catch (_: Exception) { }
    }

    private suspend fun fetchFollows(userId: String) {
        try {
            _follows.value = supabase.postgrest.from("follows")
                .select { filter { eq("user_id", userId) }; order("created_at", Order.DESCENDING) }
                .decodeList()
        } catch (_: Exception) { }
    }

    private suspend fun fetchFollowCounts(userId: String) {
        try {
            val followers = supabase.postgrest.from("user_follows")
                .select { filter { eq("following_id", userId) } }
                .decodeList<UserFollow>()
            _followerCount.value = followers.size

            val following = supabase.postgrest.from("user_follows")
                .select { filter { eq("follower_id", userId) } }
                .decodeList<UserFollow>()
            _followingCount.value = following.size
        } catch (_: Exception) { }
    }

    fun isFollowing(userId: String): Boolean = followManager.isFollowingUser(userId)

    fun toggleFollow(userId: String) {
        viewModelScope.launch {
            val myId = authManager.userId ?: return@launch
            if (followManager.isFollowingUser(userId)) {
                followManager.unfollowUser(myId, userId)
            } else {
                followManager.followUser(myId, userId)
            }
        }
    }

    fun unfollowItem(followId: String) {
        viewModelScope.launch {
            val userId = authManager.userId ?: return@launch
            followManager.unfollow(followId, userId)
            // Remove from local list immediately for responsive UI
            _follows.value = _follows.value.filter { it.id != followId }
        }
    }

    fun blockUser(userId: String, onComplete: () -> Unit) {
        viewModelScope.launch {
            val myId = authManager.userId ?: return@launch
            blockManager.blockUser(myId, userId)
            onComplete()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    navController: NavHostController,
    viewingUsername: String? = null,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val profile by viewModel.viewingProfile.collectAsState()
    val lyrics by viewModel.userLyrics.collectAsState()
    val resonated by viewModel.resonatedLyrics.collectAsState()
    val notes by viewModel.publicNotes.collectAsState()
    val collections by viewModel.collections.collectAsState()
    val follows by viewModel.follows.collectAsState()
    val followerCount by viewModel.followerCount.collectAsState()
    val followingCount by viewModel.followingCount.collectAsState()
    val ownProfile by viewModel.authManager.profile.collectAsState()
    val isOwnProfile = viewingUsername == null || viewingUsername == ownProfile?.username
    var selectedTab by remember { mutableIntStateOf(0) }
    var showMenu by remember { mutableStateOf(false) }
    var showBlockDialog by remember { mutableStateOf(false) }

    val tabs = if (isOwnProfile) listOf("Lyrics", "Resonated", "Notes", "Collections", "Following")
    else listOf("Lyrics")

    LaunchedEffect(viewingUsername) {
        viewModel.loadProfile(viewingUsername)
    }

    if (showBlockDialog && profile != null) {
        AlertDialog(
            onDismissRequest = { showBlockDialog = false },
            title = { Text("Block @${profile!!.username}?", style = Theme.dmSans(18f, FontWeight.SemiBold), color = Theme.textPrimary) },
            text = { Text("They won't be able to see your earwyrms or interact with you.", style = Theme.dmSans(14f), color = Theme.textSecondary) },
            confirmButton = {
                Button(
                    onClick = { viewModel.blockUser(profile!!.id) { showBlockDialog = false; navController.popBackStack() } },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE74C3C))
                ) { Text("Block", style = Theme.dmSans(14f, FontWeight.SemiBold)) }
            },
            dismissButton = {
                Button(
                    onClick = { showBlockDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = Theme.divider, contentColor = Theme.textPrimary)
                ) { Text("Cancel", style = Theme.dmSans(14f)) }
            },
            containerColor = Theme.card
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        TopAppBar(
            title = { },
            navigationIcon = {
                if (!isOwnProfile) {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back", tint = Theme.textPrimary)
                    }
                }
            },
            actions = {
                if (isOwnProfile) {
                    IconButton(onClick = { navController.navigate(Screen.Settings.route) }) {
                        Icon(Icons.Default.Settings, "Settings", tint = Theme.textPrimary)
                    }
                } else {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Default.MoreVert, "More options", tint = Theme.textPrimary)
                        }
                        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                            DropdownMenuItem(
                                text = { Text("Block User", style = Theme.dmSans(14f), color = Color(0xFFE74C3C)) },
                                onClick = { showMenu = false; showBlockDialog = true }
                            )
                        }
                    }
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
        )

        // Profile Header
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
        ) {
            if (profile?.avatarUrl != null) {
                AsyncImage(
                    model = profile?.avatarUrl,
                    contentDescription = "Avatar",
                    modifier = Modifier.size(80.dp).clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("@${profile?.username ?: "..."}", style = Theme.dmSans(20f, FontWeight.Bold), color = Theme.textPrimary)
                if (profile?.isPlus == true) { Spacer(Modifier.width(6.dp)); PlusBadge() }
            }

            if (profile?.displayName != null) {
                Text(profile!!.displayName!!, style = Theme.dmSans(16f), color = Theme.textSecondary)
            }

            if (profile?.bio != null) {
                Spacer(Modifier.height(4.dp))
                Text(profile!!.bio!!, style = Theme.dmSans(14f), color = Theme.textSecondary, textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 32.dp))
            }

            Spacer(Modifier.height(8.dp))

            // Follower/Following counts
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$followerCount", style = Theme.dmSans(16f, FontWeight.Bold), color = Theme.textPrimary)
                    Text("followers", style = Theme.dmSans(12f), color = Theme.textMuted)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$followingCount", style = Theme.dmSans(16f, FontWeight.Bold), color = Theme.textPrimary)
                    Text("following", style = Theme.dmSans(12f), color = Theme.textMuted)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${lyrics.size}", style = Theme.dmSans(16f, FontWeight.Bold), color = Theme.textPrimary)
                    Text("earwyrms", style = Theme.dmSans(12f), color = Theme.textMuted)
                }
            }

            Spacer(Modifier.height(8.dp))

            if (!isOwnProfile && profile != null) {
                val isFollowing = viewModel.isFollowing(profile!!.id)
                Button(
                    onClick = { viewModel.toggleFollow(profile!!.id) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isFollowing) Theme.divider else Theme.accent,
                        contentColor = if (isFollowing) Theme.textPrimary else Color.White
                    ),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text(if (isFollowing) "Following" else "Follow", style = Theme.dmSans(14f, FontWeight.SemiBold))
                }
            }
        }

        // Memory Lane (own profile only, needs at least 3 past lyrics)
        if (isOwnProfile && lyrics.size >= 3) {
            MemoryLaneCarousel(lyrics = lyrics, navController = navController)
        }

        // Tabs
        if (tabs.size > 1) {
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                containerColor = Theme.background,
                contentColor = Theme.accent,
                edgePadding = 16.dp,
                indicator = { tabPositions ->
                    if (selectedTab < tabPositions.size) {
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = Theme.accent
                        )
                    }
                }
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = {
                            Text(
                                title,
                                style = Theme.dmSans(13f, if (selectedTab == index) FontWeight.SemiBold else FontWeight.Normal),
                                color = if (selectedTab == index) Theme.accent else Theme.textMuted
                            )
                        }
                    )
                }
            }
        }

        // Tab content
        when (if (isOwnProfile) selectedTab else 0) {
            0 -> ProfileLyricsTab(lyrics = lyrics, profile = profile, navController = navController)
            1 -> ProfileResonatedTab(lyrics = resonated, navController = navController)
            2 -> ProfileNotesTab(notes = notes)
            3 -> ProfileCollectionsTab(collections = collections, navController = navController)
            4 -> ProfileFollowingTab(follows = follows, onUnfollow = { viewModel.unfollowItem(it) })
        }
    }
}

@Composable
private fun ProfileLyricsTab(lyrics: List<Lyric>, profile: Profile?, navController: NavHostController) {
    if (lyrics.isEmpty()) {
        EmptyTabMessage("No earwyrms yet")
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(lyrics, key = { it.id }) { lyric ->
                ExploreLyricCard(lyric = lyric, profile = profile, navController = navController)
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun ProfileResonatedTab(lyrics: List<Lyric>, navController: NavHostController) {
    if (lyrics.isEmpty()) {
        EmptyTabMessage("No resonated earwyrms yet")
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(lyrics, key = { it.id }) { lyric ->
                ExploreLyricCard(lyric = lyric, profile = null, navController = navController)
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun ProfileNotesTab(notes: List<LyricNote>) {
    if (notes.isEmpty()) {
        EmptyTabMessage("No public notes yet")
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(notes, key = { it.id }) { note ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Theme.card),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = note.content,
                            style = Theme.dmSansItalic(14f),
                            color = Theme.textPrimary
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun ProfileCollectionsTab(collections: List<EarwyrmCollection>, navController: NavHostController) {
    if (collections.isEmpty()) {
        EmptyTabMessage("No collections yet")
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(collections, key = { it.id }) { collection ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { navController.navigate(Screen.CollectionDetail.createRoute(collection.id)) },
                    colors = CardDefaults.cardColors(containerColor = Theme.card),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(collection.name, style = Theme.dmSans(16f, FontWeight.SemiBold), color = Theme.textPrimary)
                        if (collection.description != null) {
                            Text(collection.description, style = Theme.dmSans(13f), color = Theme.textSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        if (collection.isSmart == true) {
                            Text("Smart: #${collection.smartTag}", style = Theme.dmSans(11f), color = Theme.accent)
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun ProfileFollowingTab(follows: List<Follow>, onUnfollow: (String) -> Unit) {
    if (follows.isEmpty()) {
        EmptyTabMessage("Not following anything yet")
    } else {
        val grouped = follows.groupBy { it.filterType }
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            grouped.forEach { (type, items) ->
                item {
                    Text(
                        text = when (type) {
                            "artist" -> "Artists"
                            "song" -> "Songs"
                            "tag" -> "Tags"
                            else -> type.replaceFirstChar { it.uppercase() }
                        },
                        style = Theme.dmSans(14f, FontWeight.SemiBold),
                        color = Theme.textSecondary,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
                items(items, key = { it.id }) { follow ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Theme.card),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = if (follow.filterType == "tag") "#${follow.filterValue}" else follow.filterValue,
                                style = Theme.dmSans(15f),
                                color = Theme.textPrimary,
                                modifier = Modifier.weight(1f)
                            )
                            Button(
                                onClick = { onUnfollow(follow.id) },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Theme.divider,
                                    contentColor = Theme.textSecondary
                                ),
                                shape = RoundedCornerShape(16.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                modifier = Modifier.height(30.dp)
                            ) {
                                Text("Unfollow", style = Theme.dmSans(12f, FontWeight.Medium))
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun MemoryLaneCarousel(lyrics: List<Lyric>, navController: NavHostController) {
    val pastLyrics = remember(lyrics) { lyrics.take(8) }

    Column(modifier = Modifier.padding(bottom = 8.dp)) {
        Text(
            text = "memory lane",
            style = Theme.caveat(22f),
            color = Theme.textSecondary,
            modifier = Modifier.padding(start = 20.dp, bottom = 8.dp)
        )

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(pastLyrics, key = { it.id }) { lyric ->
                MemoryLaneCard(
                    lyric = lyric,
                    onClick = {
                        if (lyric.songTitle != null) {
                            navController.navigate(
                                Screen.SongPage.createRoute(lyric.songTitle, lyric.artistName)
                            )
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun MemoryLaneCard(lyric: Lyric, onClick: () -> Unit) {
    val dateText = remember(lyric.createdAt) {
        val instant = lyric.createdAt
        val localDate = java.time.Instant.ofEpochSecond(instant.epochSeconds)
            .atZone(java.time.ZoneId.systemDefault())
            .toLocalDate()
        val formatter = java.time.format.DateTimeFormatter.ofPattern("MMM d, yyyy")
        localDate.format(formatter)
    }

    Card(
        modifier = Modifier
            .width(200.dp)
            .height(150.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Subtle cover art background
            if (lyric.coverArtUrl != null) {
                AsyncImage(
                    model = lyric.coverArtUrl,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    alpha = 0.08f
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Lyric text
                Text(
                    text = "\u201C${lyric.content}\u201D",
                    style = Theme.caveat(18f),
                    color = Theme.textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Column {
                    // Song / Artist attribution
                    if (lyric.songTitle != null || lyric.artistName != null) {
                        val attribution = listOfNotNull(lyric.songTitle, lyric.artistName)
                            .joinToString(" \u2014 ")
                        Text(
                            text = attribution,
                            style = Theme.dmSansItalic(11f),
                            color = Theme.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(Modifier.height(4.dp))

                    // Date badge
                    Text(
                        text = dateText,
                        style = Theme.dmSans(10f, FontWeight.Medium),
                        color = Theme.accent,
                        modifier = Modifier
                            .background(
                                color = Theme.accent.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(50)
                            )
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyTabMessage(message: String) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(message, style = Theme.dmSans(14f), color = Theme.textMuted, textAlign = TextAlign.Center)
    }
}
