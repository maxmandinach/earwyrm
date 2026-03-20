package com.earwyrm.app.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.design.ToastManager
import com.earwyrm.app.core.model.*
import com.earwyrm.app.core.supabase.CollectionManager
import com.earwyrm.app.core.network.NetworkMonitor
import com.earwyrm.app.core.subscription.BillingManager
import com.earwyrm.app.core.supabase.NotificationManager
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
class HomeViewModel @Inject constructor(private val supabase: SupabaseClient, private val authManager: AuthManager, val collectionManager: CollectionManager, private val notificationManager: NotificationManager, val networkMonitor: NetworkMonitor, val billingManager: BillingManager, private val toastManager: ToastManager) : ViewModel() {
    private val _currentLyric = MutableStateFlow<Lyric?>(null); val currentLyric: StateFlow<Lyric?> = _currentLyric.asStateFlow()
    private val _pastLyrics = MutableStateFlow<List<Lyric>>(emptyList()); val pastLyrics: StateFlow<List<Lyric>> = _pastLyrics.asStateFlow()
    private val _currentNote = MutableStateFlow<LyricNote?>(null); val currentNote: StateFlow<LyricNote?> = _currentNote.asStateFlow()
    private val _comments = MutableStateFlow<List<Comment>>(emptyList()); val comments: StateFlow<List<Comment>> = _comments.asStateFlow()
    private val _commentProfiles = MutableStateFlow<Map<String, Profile>>(emptyMap()); val commentProfiles: StateFlow<Map<String, Profile>> = _commentProfiles.asStateFlow()
    private val _hasReacted = MutableStateFlow(false); val hasReacted: StateFlow<Boolean> = _hasReacted.asStateFlow()
    private val _reactionCount = MutableStateFlow(0); val reactionCount: StateFlow<Int> = _reactionCount.asStateFlow()
    private val _isLoading = MutableStateFlow(false); val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    val profile = authManager.profile

    init { loadData() }

    fun loadData() { viewModelScope.launch { _isLoading.value = true; try { fetchCurrentLyric(); fetchPastLyrics(); authManager.userId?.let { collectionManager.fetchCollections(it) } } finally { _isLoading.value = false } } }

    private suspend fun fetchCurrentLyric() {
        val userId = authManager.userId ?: return
        try {
            val result = supabase.postgrest.from("lyrics").select { filter { eq("user_id", userId); eq("is_current", true) }; limit(1) }.decodeList<Lyric>()
            val lyric = result.firstOrNull(); _currentLyric.value = lyric; _reactionCount.value = lyric?.reactionCount ?: 0
            if (lyric != null) { fetchNote(lyric.id); checkReaction(lyric.id); fetchComments(lyric.id) }
        } catch (_: Exception) { }
    }

    private suspend fun fetchPastLyrics() { val userId = authManager.userId ?: return; try { _pastLyrics.value = supabase.postgrest.from("lyrics").select { filter { eq("user_id", userId); eq("is_current", false) }; order("created_at", Order.DESCENDING) }.decodeList() } catch (_: Exception) { } }
    private suspend fun fetchNote(lyricId: String) { val userId = authManager.userId ?: return; try { _currentNote.value = supabase.postgrest.from("lyric_notes").select { filter { eq("lyric_id", lyricId); eq("user_id", userId) } }.decodeList<LyricNote>().firstOrNull() } catch (_: Exception) { } }
    private suspend fun checkReaction(lyricId: String) { val userId = authManager.userId ?: return; try { _hasReacted.value = supabase.postgrest.from("reactions").select { filter { eq("lyric_id", lyricId); eq("user_id", userId) }; limit(1) }.decodeList<Reaction>().isNotEmpty() } catch (_: Exception) { } }

    fun toggleReaction() {
        val lyricId = _currentLyric.value?.id ?: return; val userId = authManager.userId ?: return
        val was = _hasReacted.value; _hasReacted.value = !was; _reactionCount.value += if (was) -1 else 1
        viewModelScope.launch { try { if (was) supabase.postgrest.from("reactions").delete { filter { eq("lyric_id", lyricId); eq("user_id", userId) } } else supabase.postgrest.from("reactions").insert(ReactionInsert(lyricId, userId)) } catch (_: Exception) { _hasReacted.value = was; _reactionCount.value += if (was) 1 else -1; toastManager.show("couldn't resonate, try again") } }
    }

    fun toggleVisibility() {
        val lyric = _currentLyric.value ?: return; val newPublic = !(lyric.isPublic ?: true)
        viewModelScope.launch { try { supabase.postgrest.from("lyrics").update(LyricUpdate(isPublic = newPublic)) { filter { eq("id", lyric.id) } }; _currentLyric.value = lyric.copy(isPublic = newPublic) } catch (_: Exception) { toastManager.show("couldn't update visibility, try again") } }
    }

    fun fetchComments(lyricId: String) {
        viewModelScope.launch {
            try {
                val result = supabase.postgrest.from("comments").select { filter { eq("lyric_id", lyricId) }; order("created_at", Order.ASCENDING) }.decodeList<Comment>()
                _comments.value = result
                val userIds = result.map { it.userId }.distinct()
                if (userIds.isNotEmpty()) _commentProfiles.value = supabase.postgrest.from("profiles").select { filter { isIn("id", userIds) } }.decodeList<Profile>().associateBy { it.id }
            } catch (_: Exception) { }
        }
    }

    fun submitComment(content: String, parentCommentId: String? = null) {
        val lyricId = _currentLyric.value?.id ?: return; val userId = authManager.userId ?: return
        viewModelScope.launch { try { supabase.postgrest.from("comments").insert(CommentInsert(lyricId, userId, content.take(280), parentCommentId)); fetchComments(lyricId) } catch (_: Exception) { toastManager.show("couldn't post comment, try again") } }
    }

    fun deleteComment(commentId: String) { viewModelScope.launch { try { supabase.postgrest.from("comments").delete { filter { eq("id", commentId) } }; _comments.value = _comments.value.filter { it.id != commentId } } catch (_: Exception) { toastManager.show("couldn't delete comment, try again") } } }

    fun updateLyric(newContent: String) {
        val lyric = _currentLyric.value ?: return
        viewModelScope.launch { try { supabase.postgrest.from("lyrics").update(LyricUpdate(content = newContent)) { filter { eq("id", lyric.id) } }; _currentLyric.value = lyric.copy(content = newContent) } catch (_: Exception) { toastManager.show("couldn't update lyric, try again") } }
    }

    fun saveNote(content: String, isPublic: Boolean) {
        val lyricId = _currentLyric.value?.id ?: return; val userId = authManager.userId ?: return
        viewModelScope.launch { try { supabase.postgrest.from("lyric_notes").upsert(LyricNoteUpsert(lyricId, userId, content.take(500), isPublic)); fetchNote(lyricId) } catch (_: Exception) { toastManager.show("couldn't save note, try again") } }
    }

    fun sendShareNotification(lyric: Lyric) {
        val actorId = authManager.userId ?: return
        val actorUsername = authManager.profile.value?.username ?: return
        viewModelScope.launch { notificationManager.sendShareNotification(lyric.userId, actorId, actorUsername, lyric) }
    }
}
