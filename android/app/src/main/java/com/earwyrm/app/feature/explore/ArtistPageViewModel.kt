package com.earwyrm.app.feature.explore

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.Profile
import com.earwyrm.app.core.model.Reaction
import com.earwyrm.app.core.model.ReactionInsert
import com.earwyrm.app.core.supabase.BlockManager
import com.earwyrm.app.core.supabase.FollowManager
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ArtistSortOption(val label: String) {
    NEWEST("Newest"),
    MOST_RESONATED("Most Resonated"),
    MOST_DISCUSSED("Most Discussed")
}

data class ArtistSong(
    val songTitle: String,
    val coverArtUrl: String?,
    val saveCount: Int
)

data class ArtistStats(
    val totalSaves: Int,
    val uniqueSavers: Int,
    val songCount: Int,
    val reactionsCount: Int,
    val commentsCount: Int
)

@HiltViewModel
class ArtistPageViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    private val authManager: AuthManager,
    val followManager: FollowManager,
    private val blockManager: BlockManager
) : ViewModel() {

    private val _lyrics = MutableStateFlow<List<Lyric>>(emptyList())
    val lyrics: StateFlow<List<Lyric>> = _lyrics.asStateFlow()

    private val _profiles = MutableStateFlow<Map<String, Profile>>(emptyMap())
    val profiles: StateFlow<Map<String, Profile>> = _profiles.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _sortOption = MutableStateFlow(ArtistSortOption.NEWEST)
    val sortOption: StateFlow<ArtistSortOption> = _sortOption.asStateFlow()

    private val _reactedLyricIds = MutableStateFlow<Set<String>>(emptySet())
    val reactedLyricIds: StateFlow<Set<String>> = _reactedLyricIds.asStateFlow()

    private val _reactionCountDeltas = MutableStateFlow<Map<String, Int>>(emptyMap())
    val reactionCountDeltas: StateFlow<Map<String, Int>> = _reactionCountDeltas.asStateFlow()

    val filteredLyrics: StateFlow<List<Lyric>> = combine(
        _lyrics, _searchQuery, _sortOption
    ) { lyrics, query, sort ->
        var result = lyrics
        if (query.isNotBlank()) {
            val q = query.lowercase()
            result = result.filter { it.content.lowercase().contains(q) }
        }
        when (sort) {
            ArtistSortOption.NEWEST -> result.sortedByDescending { it.createdAt }
            ArtistSortOption.MOST_RESONATED -> result.sortedByDescending { it.reactionCount ?: 0 }
            ArtistSortOption.MOST_DISCUSSED -> result.sortedByDescending { it.commentCount ?: 0 }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val uniqueSongs: StateFlow<List<ArtistSong>> = _lyrics.combine(_lyrics) { lyrics, _ ->
        lyrics
            .filter { it.songTitle != null }
            .groupBy { it.songTitle!! }
            .map { (title, lyricsForSong) ->
                ArtistSong(
                    songTitle = title,
                    coverArtUrl = lyricsForSong.firstOrNull()?.coverArtUrl,
                    saveCount = lyricsForSong.size
                )
            }
            .sortedByDescending { it.saveCount }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val stats: StateFlow<ArtistStats> = _lyrics.combine(_lyrics) { lyrics, _ ->
        ArtistStats(
            totalSaves = lyrics.size,
            uniqueSavers = lyrics.map { it.userId }.distinct().size,
            songCount = lyrics.mapNotNull { it.songTitle }.distinct().size,
            reactionsCount = lyrics.sumOf { it.reactionCount ?: 0 },
            commentsCount = lyrics.sumOf { it.commentCount ?: 0 }
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ArtistStats(0, 0, 0, 0, 0))

    fun setSearchQuery(query: String) { _searchQuery.value = query }
    fun setSortOption(option: ArtistSortOption) { _sortOption.value = option }

    fun getBlockManager(): BlockManager = blockManager
    fun getReporterId(): String? = authManager.userId
    fun getUserId(): String? = authManager.userId

    fun loadArtist(artistName: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val blocked = blockManager.blockedUserIds.value
                val result = supabase.postgrest.from("lyrics")
                    .select {
                        filter {
                            eq("is_public", true)
                            ilike("artist_name", artistName)
                        }
                        order("created_at", Order.DESCENDING)
                        limit(100)
                    }
                    .decodeList<Lyric>()

                _lyrics.value = result.filter { it.userId !in blocked }
                fetchProfilesFor(result)
                fetchUserReactions(result.map { it.id })
            } catch (_: Exception) {
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun toggleReaction(lyricId: String) {
        val userId = authManager.userId ?: return
        val wasReacted = lyricId in _reactedLyricIds.value
        _reactedLyricIds.value = if (wasReacted) _reactedLyricIds.value - lyricId else _reactedLyricIds.value + lyricId
        _reactionCountDeltas.value = _reactionCountDeltas.value + (lyricId to ((_reactionCountDeltas.value[lyricId] ?: 0) + if (wasReacted) -1 else 1))
        viewModelScope.launch {
            try {
                if (wasReacted) {
                    supabase.postgrest.from("reactions").delete { filter { eq("lyric_id", lyricId); eq("user_id", userId) } }
                } else {
                    supabase.postgrest.from("reactions").insert(ReactionInsert(lyricId, userId))
                }
            } catch (_: Exception) {
                _reactedLyricIds.value = if (wasReacted) _reactedLyricIds.value + lyricId else _reactedLyricIds.value - lyricId
                _reactionCountDeltas.value = _reactionCountDeltas.value + (lyricId to ((_reactionCountDeltas.value[lyricId] ?: 0) + if (wasReacted) 1 else -1))
            }
        }
    }

    fun toggleFollow(artistName: String) {
        val userId = authManager.userId ?: return
        viewModelScope.launch {
            if (followManager.isFollowing("artist", artistName)) {
                val followId = followManager.getFollowId("artist", artistName)
                if (followId != null) followManager.unfollow(followId, userId)
            } else {
                followManager.follow(userId, "artist", artistName)
            }
        }
    }

    private suspend fun fetchProfilesFor(lyrics: List<Lyric>) {
        val userIds = lyrics.map { it.userId }.distinct()
            .filter { it !in _profiles.value }
        if (userIds.isEmpty()) return
        try {
            val profiles = supabase.postgrest.from("profiles")
                .select { filter { isIn("id", userIds) } }
                .decodeList<Profile>()
            _profiles.value = _profiles.value + profiles.associateBy { it.id }
        } catch (_: Exception) { }
    }

    private suspend fun fetchUserReactions(lyricIds: List<String>) {
        val userId = authManager.userId ?: return
        if (lyricIds.isEmpty()) return
        try {
            val reactions = supabase.postgrest.from("reactions")
                .select { filter { eq("user_id", userId); isIn("lyric_id", lyricIds) } }
                .decodeList<Reaction>()
            _reactedLyricIds.value = _reactedLyricIds.value + reactions.map { it.lyricId }.toSet()
        } catch (_: Exception) { }
    }
}
