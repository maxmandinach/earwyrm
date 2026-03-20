package com.earwyrm.app.feature.explore

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.Profile
import com.earwyrm.app.core.supabase.BlockManager
import com.earwyrm.app.core.supabase.FollowManager
import com.earwyrm.app.core.model.Reaction
import com.earwyrm.app.core.model.ReactionInsert
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import javax.inject.Inject
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours

enum class SortOption(val label: String) {
    NEWEST("Newest"),
    MOST_RESONATED("Most Resonated"),
    MOST_DISCUSSED("Most Discussed")
}

enum class TimeRange(val label: String) {
    ALL_TIME("All Time"),
    THIS_MONTH("This Month"),
    THIS_WEEK("This Week"),
    TODAY("Today")
}

data class SearchResults(
    val songs: List<Pair<String, String?>> = emptyList(), // title to artist
    val artists: List<String> = emptyList(),
    val users: List<Profile> = emptyList(),
    val lyrics: List<Lyric> = emptyList()
) {
    val isEmpty: Boolean get() = songs.isEmpty() && artists.isEmpty() && users.isEmpty() && lyrics.isEmpty()
}

@HiltViewModel
class ExploreViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    private val authManager: AuthManager,
    private val followManager: FollowManager,
    private val blockManager: BlockManager
) : ViewModel() {

    private val _forYouLyrics = MutableStateFlow<List<Lyric>>(emptyList())
    val forYouLyrics: StateFlow<List<Lyric>> = _forYouLyrics.asStateFlow()

    private val _followingLyrics = MutableStateFlow<List<Lyric>>(emptyList())
    val followingLyrics: StateFlow<List<Lyric>> = _followingLyrics.asStateFlow()

    private val _lyricProfiles = MutableStateFlow<Map<String, Profile>>(emptyMap())
    val lyricProfiles: StateFlow<Map<String, Profile>> = _lyricProfiles.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _selectedTab = MutableStateFlow(0)
    val selectedTab: StateFlow<Int> = _selectedTab.asStateFlow()

    // Search & filter state
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _sortOption = MutableStateFlow(SortOption.NEWEST)
    val sortOption: StateFlow<SortOption> = _sortOption.asStateFlow()

    private val _timeRange = MutableStateFlow(TimeRange.ALL_TIME)
    val timeRange: StateFlow<TimeRange> = _timeRange.asStateFlow()

    private val _trendingTags = MutableStateFlow<List<Pair<String, Int>>>(emptyList())
    val trendingTags: StateFlow<List<Pair<String, Int>>> = _trendingTags.asStateFlow()

    private val _selectedTag = MutableStateFlow<String?>(null)
    val selectedTag: StateFlow<String?> = _selectedTag.asStateFlow()

    // Search results
    private val _searchResults = MutableStateFlow(SearchResults())
    val searchResults: StateFlow<SearchResults> = _searchResults.asStateFlow()

    private val _isSearching = MutableStateFlow(false)
    val isSearching: StateFlow<Boolean> = _isSearching.asStateFlow()

    val isSearchActive: StateFlow<Boolean> = _searchQuery.map { query ->
        query.isNotBlank()
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    // Reaction state: set of lyric IDs the current user has reacted to
    private val _reactedLyricIds = MutableStateFlow<Set<String>>(emptySet())
    val reactedLyricIds: StateFlow<Set<String>> = _reactedLyricIds.asStateFlow()

    // Local reaction count overrides (lyricId -> delta from server count)
    private val _reactionCountDeltas = MutableStateFlow<Map<String, Int>>(emptyMap())
    val reactionCountDeltas: StateFlow<Map<String, Int>> = _reactionCountDeltas.asStateFlow()

    // Filtered versions (only apply sort/time/tag, not search query — search has its own results)
    val filteredForYouLyrics: StateFlow<List<Lyric>> = combine(
        _forYouLyrics, _sortOption, _timeRange, _selectedTag
    ) { lyrics, sort, time, tag ->
        applyFilters(lyrics, sort, time, tag)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val filteredFollowingLyrics: StateFlow<List<Lyric>> = combine(
        _followingLyrics, _sortOption, _timeRange, _selectedTag
    ) { lyrics, sort, time, tag ->
        applyFilters(lyrics, sort, time, tag)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private var searchJob: Job? = null

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
        if (query.isBlank()) {
            _searchResults.value = SearchResults()
            _isSearching.value = false
            searchJob?.cancel()
        } else {
            // Debounce search
            searchJob?.cancel()
            searchJob = viewModelScope.launch {
                delay(300)
                performSearch(query)
            }
        }
    }

    fun setSortOption(option: SortOption) { _sortOption.value = option }
    fun setTimeRange(range: TimeRange) { _timeRange.value = range }
    fun setSelectedTag(tag: String?) {
        _selectedTag.value = if (_selectedTag.value == tag) null else tag
    }

    private fun applyFilters(
        lyrics: List<Lyric>,
        sort: SortOption,
        time: TimeRange,
        tag: String?
    ): List<Lyric> {
        var result = lyrics

        // Time range filter
        val now = Clock.System.now()
        result = when (time) {
            TimeRange.TODAY -> result.filter { it.createdAt >= now - 24.hours }
            TimeRange.THIS_WEEK -> result.filter { it.createdAt >= now - 7.days }
            TimeRange.THIS_MONTH -> result.filter { it.createdAt >= now - 30.days }
            TimeRange.ALL_TIME -> result
        }

        // Tag filter
        if (tag != null) {
            result = result.filter { lyric ->
                lyric.tags?.any { it.equals(tag, ignoreCase = true) } == true
            }
        }

        // Sort
        result = when (sort) {
            SortOption.MOST_RESONATED -> result.sortedByDescending { it.reactionCount ?: 0 }
            SortOption.MOST_DISCUSSED -> result.sortedByDescending { it.commentCount ?: 0 }
            SortOption.NEWEST -> result.sortedByDescending { it.createdAt }
        }

        return result
    }

    private fun computeTrendingTags(lyrics: List<Lyric>) {
        val tagCounts = mutableMapOf<String, Int>()
        lyrics.forEach { lyric ->
            lyric.tags?.forEach { tag ->
                tagCounts[tag] = (tagCounts[tag] ?: 0) + 1
            }
        }
        _trendingTags.value = tagCounts.entries
            .sortedByDescending { it.value }
            .take(10)
            .map { it.key to it.value }
    }

    private suspend fun performSearch(query: String) {
        _isSearching.value = true
        val blocked = blockManager.blockedUserIds.value
        try {
            // Search lyrics by content, song title, artist name
            val q = query.trim()
            val matchingLyrics = supabase.postgrest.from("lyrics")
                .select {
                    filter {
                        eq("is_current", true)
                        eq("is_public", true)
                        or {
                            ilike("content", "%$q%")
                            ilike("song_title", "%$q%")
                            ilike("artist_name", "%$q%")
                        }
                    }
                    order("created_at", Order.DESCENDING)
                    limit(30)
                }
                .decodeList<Lyric>()
                .filter { it.userId !in blocked }

            // Extract distinct songs (title + artist pairs)
            val songs = matchingLyrics
                .filter { it.songTitle != null }
                .map { it.songTitle!! to it.artistName }
                .distinctBy { "${it.first.lowercase()}|${it.second?.lowercase()}" }
                .take(10)

            // Extract distinct artists
            val artists = matchingLyrics
                .mapNotNull { it.artistName }
                .distinct()
                .filter { it.lowercase().contains(q.lowercase()) }
                .take(10)

            // Search users by username
            val matchingUsers = try {
                supabase.postgrest.from("profiles")
                    .select {
                        filter {
                            ilike("username", "%$q%")
                        }
                        limit(10)
                    }
                    .decodeList<Profile>()
                    .filter { it.id !in blocked }
            } catch (_: Exception) { emptyList() }

            // Fetch profiles for lyric authors
            fetchProfilesFor(matchingLyrics)

            _searchResults.value = SearchResults(
                songs = songs,
                artists = artists,
                users = matchingUsers,
                lyrics = matchingLyrics
            )
        } catch (_: Exception) {
            _searchResults.value = SearchResults()
        } finally {
            _isSearching.value = false
        }
    }

    fun toggleReaction(lyricId: String) {
        val userId = authManager.userId ?: return
        val wasReacted = lyricId in _reactedLyricIds.value
        // Optimistic update
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
                // Revert on failure
                _reactedLyricIds.value = if (wasReacted) _reactedLyricIds.value + lyricId else _reactedLyricIds.value - lyricId
                _reactionCountDeltas.value = _reactionCountDeltas.value + (lyricId to ((_reactionCountDeltas.value[lyricId] ?: 0) + if (wasReacted) 1 else -1))
            }
        }
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

    init {
        loadData()
    }

    fun selectTab(tab: Int) {
        _selectedTab.value = tab
    }

    fun loadData() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                fetchForYou()
                fetchFollowing()
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun fetchForYou() {
        val userId = authManager.userId ?: return
        val blocked = blockManager.blockedUserIds.value
        try {
            val result = supabase.postgrest.from("lyrics")
                .select {
                    filter {
                        eq("is_current", true)
                        eq("is_public", true)
                        neq("user_id", userId)
                    }
                    order("created_at", Order.DESCENDING)
                    limit(50)
                }
                .decodeList<Lyric>()
            _forYouLyrics.value = result.filter { it.userId !in blocked }
            computeTrendingTags(_forYouLyrics.value)
            fetchProfilesFor(result)
            fetchUserReactions(_forYouLyrics.value.map { it.id })
        } catch (_: Exception) { }
    }

    private suspend fun fetchFollowing() {
        val userId = authManager.userId ?: return
        val follows = followManager.follows.value
        val userFollows = followManager.userFollows.value
        val blocked = blockManager.blockedUserIds.value

        try {
            val allLyrics = mutableListOf<Lyric>()

            // Lyrics from followed users
            val followedUserIds = userFollows.map { it.followingId }
            if (followedUserIds.isNotEmpty()) {
                val userLyrics = supabase.postgrest.from("lyrics")
                    .select {
                        filter {
                            eq("is_current", true)
                            eq("is_public", true)
                            isIn("user_id", followedUserIds)
                        }
                        order("created_at", Order.DESCENDING)
                    }
                    .decodeList<Lyric>()
                allLyrics.addAll(userLyrics)
            }

            // Lyrics matching followed artists/songs/tags
            follows.forEach { follow ->
                try {
                    val matchingLyrics = when (follow.filterType) {
                        "artist" -> supabase.postgrest.from("lyrics")
                            .select {
                                filter {
                                    eq("is_current", true)
                                    eq("is_public", true)
                                    eq("artist_name", follow.filterValue)
                                }
                                limit(10)
                            }
                            .decodeList<Lyric>()
                        "song" -> supabase.postgrest.from("lyrics")
                            .select {
                                filter {
                                    eq("is_current", true)
                                    eq("is_public", true)
                                    eq("song_title", follow.filterValue)
                                }
                                limit(10)
                            }
                            .decodeList<Lyric>()
                        else -> emptyList()
                    }
                    allLyrics.addAll(matchingLyrics)
                } catch (_: Exception) { }
            }

            _followingLyrics.value = allLyrics
                .filter { it.userId !in blocked && it.userId != userId }
                .distinctBy { it.id }
                .sortedByDescending { it.createdAt }
            fetchProfilesFor(allLyrics)
            fetchUserReactions(_followingLyrics.value.map { it.id })
        } catch (_: Exception) { }
    }

    fun getBlockManager(): BlockManager = blockManager
    fun getReporterId(): String? = authManager.userId

    private suspend fun fetchProfilesFor(lyrics: List<Lyric>) {
        val userIds = lyrics.map { it.userId }.distinct()
            .filter { it !in _lyricProfiles.value }
        if (userIds.isEmpty()) return
        try {
            val profiles = supabase.postgrest.from("profiles")
                .select { filter { isIn("id", userIds) } }
                .decodeList<Profile>()
            _lyricProfiles.value = _lyricProfiles.value + profiles.associateBy { it.id }
        } catch (_: Exception) { }
    }
}
