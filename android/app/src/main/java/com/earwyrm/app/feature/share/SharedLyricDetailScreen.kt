package com.earwyrm.app.feature.share

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.DmSansFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.Profile
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.core.util.formatRelativeTime
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SharedLyricDetailViewModel @Inject constructor(
    private val supabase: SupabaseClient
) : ViewModel() {

    private val _lyric = MutableStateFlow<Lyric?>(null)
    val lyric: StateFlow<Lyric?> = _lyric.asStateFlow()

    private val _username = MutableStateFlow<String?>(null)
    val username: StateFlow<String?> = _username.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun fetchByShareToken(shareToken: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val lyrics = supabase.postgrest.from("lyrics")
                    .select {
                        filter { eq("share_token", shareToken) }
                        limit(1)
                    }
                    .decodeList<Lyric>()

                val found = lyrics.firstOrNull()
                if (found == null) {
                    _error.value = "This lyric may have been removed or the link is invalid."
                    _isLoading.value = false
                    return@launch
                }

                _lyric.value = found

                // Fetch poster's username
                try {
                    val profiles = supabase.postgrest.from("profiles")
                        .select {
                            filter { eq("id", found.userId) }
                            limit(1)
                        }
                        .decodeList<Profile>()
                    _username.value = profiles.firstOrNull()?.username
                } catch (_: Exception) { }

                _isLoading.value = false
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load lyric"
                _isLoading.value = false
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SharedLyricDetailScreen(
    shareToken: String,
    navController: NavHostController,
    viewModel: SharedLyricDetailViewModel = hiltViewModel()
) {
    val lyric by viewModel.lyric.collectAsState()
    val username by viewModel.username.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(shareToken) {
        viewModel.fetchByShareToken(shareToken)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Shared Lyric", fontFamily = DmSansFamily, fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Theme.background,
                    titleContentColor = Theme.textPrimary,
                    navigationIconContentColor = Theme.textPrimary
                )
            )
        },
        containerColor = Theme.background
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                isLoading -> {
                    CircularProgressIndicator(
                        color = Theme.accent,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                error != null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(horizontal = 32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            "lyric not found",
                            fontFamily = CaveatFamily,
                            fontSize = 28.sp,
                            color = Theme.textPrimary
                        )
                        Text(
                            error ?: "",
                            fontFamily = DmSansFamily,
                            fontSize = 13.sp,
                            color = Theme.textMuted
                        )
                    }
                }
                lyric != null -> {
                    val l = lyric!!
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp, vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Lyric card
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Theme.card),
                            shape = RoundedCornerShape(16.dp),
                            elevation = CardDefaults.cardElevation(2.dp)
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                // Song info header
                                if (l.songTitle != null || l.coverArtUrl != null) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .then(
                                                if (l.songTitle != null) Modifier.clickable {
                                                    navController.navigate(
                                                        Screen.SongPage.createRoute(l.songTitle, l.artistName)
                                                    )
                                                } else Modifier
                                            )
                                    ) {
                                        if (l.coverArtUrl != null) {
                                            AsyncImage(
                                                l.coverArtUrl, "Album art",
                                                Modifier
                                                    .size(48.dp)
                                                    .clip(RoundedCornerShape(8.dp)),
                                                contentScale = ContentScale.Crop
                                            )
                                            Spacer(Modifier.width(12.dp))
                                        }
                                        Column(Modifier.weight(1f)) {
                                            l.songTitle?.let {
                                                Text(
                                                    it,
                                                    fontFamily = DmSansFamily,
                                                    fontSize = 15.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = Theme.textPrimary,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                            l.artistName?.let {
                                                Text(
                                                    it,
                                                    fontFamily = DmSansFamily,
                                                    fontSize = 13.sp,
                                                    color = Theme.textSecondary,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(12.dp))
                                }

                                // Lyric content
                                Text(
                                    l.content,
                                    fontFamily = CaveatFamily,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Theme.textPrimary,
                                    lineHeight = 30.sp
                                )

                                // Tags
                                if (!l.tags.isNullOrEmpty()) {
                                    Spacer(Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        l.tags.take(3).forEach {
                                            Text(
                                                "#$it",
                                                fontFamily = DmSansFamily,
                                                fontSize = 12.sp,
                                                color = Theme.accent,
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(4.dp))
                                                    .background(Theme.accent.copy(alpha = 0.1f))
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }

                                // Timestamp
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    formatRelativeTime(l.createdAt),
                                    fontFamily = DmSansFamily,
                                    fontSize = 11.sp,
                                    color = Theme.textMuted
                                )
                            }
                        }

                        // Posted by attribution
                        username?.let { name ->
                            Text(
                                "posted by @$name",
                                fontFamily = DmSansFamily,
                                fontSize = 14.sp,
                                color = Theme.accent,
                                modifier = Modifier
                                    .align(Alignment.CenterHorizontally)
                                    .clickable {
                                        navController.navigate(Screen.PublicProfile.createRoute(name))
                                    }
                            )
                        }
                    }
                }
            }
        }
    }
}
