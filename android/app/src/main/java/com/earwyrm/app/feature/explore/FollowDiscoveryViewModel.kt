package com.earwyrm.app.feature.explore

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.supabase.FollowManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class FollowDiscoveryViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val followManager: FollowManager
) : ViewModel() {

    val follows = followManager.follows

    init {
        viewModelScope.launch {
            authManager.userId?.let { followManager.fetchFollows(it) }
        }
    }

    suspend fun toggleFollow(artistName: String) {
        val userId = authManager.userId ?: return
        val existingFollowId = followManager.getFollowId("artist", artistName)
        if (existingFollowId != null) {
            followManager.unfollow(existingFollowId, userId)
        } else {
            followManager.follow(userId, "artist", artistName)
        }
    }
}
