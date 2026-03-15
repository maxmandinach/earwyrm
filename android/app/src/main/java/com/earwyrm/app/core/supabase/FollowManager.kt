package com.earwyrm.app.core.supabase

import com.earwyrm.app.core.model.*
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FollowManager @Inject constructor(private val supabase: SupabaseClient) {
    private val _follows = MutableStateFlow<List<Follow>>(emptyList())
    val follows: StateFlow<List<Follow>> = _follows.asStateFlow()
    private val _userFollows = MutableStateFlow<List<UserFollow>>(emptyList())
    val userFollows: StateFlow<List<UserFollow>> = _userFollows.asStateFlow()

    suspend fun fetchFollows(userId: String) { try { _follows.value = supabase.postgrest.from("follows").select { filter { eq("user_id", userId) } }.decodeList() } catch (_: Exception) { } }
    suspend fun fetchUserFollows(userId: String) { try { _userFollows.value = supabase.postgrest.from("user_follows").select { filter { eq("follower_id", userId) } }.decodeList() } catch (_: Exception) { } }
    suspend fun follow(userId: String, filterType: String, filterValue: String) { try { supabase.postgrest.from("follows").insert(FollowInsert(userId, filterType, filterValue)); fetchFollows(userId) } catch (_: Exception) { } }
    suspend fun unfollow(followId: String, userId: String) { try { supabase.postgrest.from("follows").delete { filter { eq("id", followId) } }; fetchFollows(userId) } catch (_: Exception) { } }
    suspend fun followUser(followerId: String, followingId: String) { try { supabase.postgrest.from("user_follows").insert(UserFollowInsert(followerId, followingId)); fetchUserFollows(followerId) } catch (_: Exception) { } }
    suspend fun unfollowUser(followerId: String, followingId: String) { try { supabase.postgrest.from("user_follows").delete { filter { eq("follower_id", followerId); eq("following_id", followingId) } }; fetchUserFollows(followerId) } catch (_: Exception) { } }
    fun isFollowing(filterType: String, filterValue: String) = _follows.value.any { it.filterType == filterType && it.filterValue == filterValue }
    fun isFollowingUser(followingId: String) = _userFollows.value.any { it.followingId == followingId }
    fun getFollowId(filterType: String, filterValue: String) = _follows.value.firstOrNull { it.filterType == filterType && it.filterValue == filterValue }?.id
}
