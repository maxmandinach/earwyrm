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
class BlockManager @Inject constructor(private val supabase: SupabaseClient) {
    private val _blockedUserIds = MutableStateFlow<Set<String>>(emptySet())
    val blockedUserIds: StateFlow<Set<String>> = _blockedUserIds.asStateFlow()

    suspend fun fetchBlockedUsers(userId: String) { try { _blockedUserIds.value = supabase.postgrest.from("user_blocks").select { filter { eq("blocker_id", userId) } }.decodeList<UserBlock>().map { it.blockedUserId }.toSet() } catch (_: Exception) { } }
    suspend fun blockUser(blockerId: String, blockedUserId: String) { try { supabase.postgrest.from("user_blocks").insert(UserBlockInsert(blockerId, blockedUserId)); _blockedUserIds.value = _blockedUserIds.value + blockedUserId } catch (_: Exception) { } }
    suspend fun unblockUser(blockerId: String, blockedUserId: String) { try { supabase.postgrest.from("user_blocks").delete { filter { eq("blocker_id", blockerId); eq("blocked_user_id", blockedUserId) } }; _blockedUserIds.value = _blockedUserIds.value - blockedUserId } catch (_: Exception) { } }
    suspend fun reportContent(reporterId: String, contentType: String, contentId: String, reason: String) { try { supabase.postgrest.from("content_reports").insert(ContentReport(reporterId, contentType, contentId, reason)) } catch (_: Exception) { } }
    fun isBlocked(userId: String) = userId in _blockedUserIds.value
}
