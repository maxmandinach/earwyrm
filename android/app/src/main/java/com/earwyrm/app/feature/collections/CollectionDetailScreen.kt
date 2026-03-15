package com.earwyrm.app.feature.collections

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavHostController
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.EarwyrmCollection
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.supabase.CollectionManager
import com.earwyrm.app.feature.home.LyricCardView
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CollectionDetailViewModel @Inject constructor(
    private val collectionManager: CollectionManager,
    private val authManager: AuthManager
) : ViewModel() {

    private val _collection = MutableStateFlow<EarwyrmCollection?>(null)
    val collection = _collection.asStateFlow()

    private val _lyrics = MutableStateFlow<List<Lyric>>(emptyList())
    val lyrics = _lyrics.asStateFlow()

    fun load(collectionId: String) {
        viewModelScope.launch {
            val col = collectionManager.collections.value.firstOrNull { it.id == collectionId }
            _collection.value = col
            if (col != null) {
                _lyrics.value = collectionManager.fetchLyricsInCollection(collectionId, col)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CollectionDetailScreen(
    collectionId: String,
    navController: NavHostController,
    viewModel: CollectionDetailViewModel = hiltViewModel()
) {
    val collection by viewModel.collection.collectAsState()
    val lyrics by viewModel.lyrics.collectAsState()

    LaunchedEffect(collectionId) {
        viewModel.load(collectionId)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        TopAppBar(
            title = {
                Text(
                    text = collection?.name ?: "Collection",
                    style = Theme.dmSans(18f, FontWeight.SemiBold),
                    color = Theme.textPrimary
                )
            },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, "Back", tint = Theme.textPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
        )

        Text(
            text = "${lyrics.size} lyric${if (lyrics.size != 1) "s" else ""}",
            style = Theme.dmSans(13f),
            color = Theme.textMuted,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(lyrics, key = { it.id }) { lyric ->
                LyricCardView(
                    lyric = lyric,
                    note = null,
                    isCurrent = false,
                    hasReacted = false,
                    reactionCount = lyric.reactionCount ?: 0,
                    onReactionToggle = { },
                    onVisibilityToggle = { },
                    onCommentClick = { },
                    onShareClick = { },
                    navController = navController
                )
            }
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}
