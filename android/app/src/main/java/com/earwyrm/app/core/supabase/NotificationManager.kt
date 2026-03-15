package com.earwyrm.app.core.supabase

import com.earwyrm.app.core.model.AppNotification
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.ShareNotificationInsert
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationManager @Inject constructor(private val supabase: SupabaseClient) {
    private val _notifications = MutableStateFlow<List<AppNotification>>(emptyList())
    val notifications: StateFlow<List<AppNotification>> = _notifications.asStateFlow()
    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()
    private var lastSeenAt: Instant? = null

    suspend fun fetchNotifications(userId: String, limit: Int = 20) {
        try { _notifications.value = supabase.postgrest.from("notifications").select { filter { eq("user_id", userId) }; order("created_at", Order.DESCENDING); limit(limit.toLong()) }.decodeList(); updateUnreadCount() } catch (_: Exception) { }
    }
    suspend fun markAllSeen(userId: String) {
        try { val now = Clock.System.now(); supabase.postgrest.from("profiles").update({ set("last_activity_seen_at", now.toString()) }) { filter { eq("id", userId) } }; lastSeenAt = now; _unreadCount.value = 0 } catch (_: Exception) { }
    }
    fun setLastSeenAt(instant: Instant?) { lastSeenAt = instant; updateUnreadCount() }
    private fun updateUnreadCount() { val s = lastSeenAt; _unreadCount.value = if (s == null) _notifications.value.size else _notifications.value.count { it.createdAt > s } }

    suspend fun sendShareNotification(lyricOwnerId: String, actorId: String, actorUsername: String, lyric: Lyric) {
        if (lyricOwnerId == actorId) return
        try {
            supabase.postgrest.from("notifications").insert(
                ShareNotificationInsert(
                    userId = lyricOwnerId,
                    lyricId = lyric.id,
                    actorId = actorId,
                    lyricSnippet = lyric.content.take(80),
                    songTitle = lyric.songTitle,
                    artistName = lyric.artistName,
                    shareToken = lyric.shareToken,
                    actorUsername = actorUsername
                )
            )
        } catch (_: Exception) { }
    }
}
