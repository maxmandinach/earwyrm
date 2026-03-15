package com.earwyrm.app.core.model

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AppNotification(
    val id: String, @SerialName("user_id") val userId: String, val type: String,
    @SerialName("lyric_id") val lyricId: String? = null,
    @SerialName("comment_id") val commentId: String? = null,
    @SerialName("collection_id") val collectionId: String? = null,
    @SerialName("actor_id") val actorId: String? = null,
    @SerialName("lyric_snippet") val lyricSnippet: String? = null,
    @SerialName("song_title") val songTitle: String? = null,
    @SerialName("artist_name") val artistName: String? = null,
    @SerialName("share_token") val shareToken: String? = null,
    @SerialName("actor_username") val actorUsername: String? = null,
    @SerialName("comment_content") val commentContent: String? = null,
    @SerialName("collection_name") val collectionName: String? = null,
    @SerialName("follow_type") val followType: String? = null,
    @SerialName("follow_value") val followValue: String? = null,
    @SerialName("read_at") val readAt: Instant? = null,
    @SerialName("created_at") val createdAt: Instant
)

@Serializable
data class ShareNotificationInsert(
    @SerialName("user_id") val userId: String,
    val type: String = "share",
    @SerialName("lyric_id") val lyricId: String,
    @SerialName("actor_id") val actorId: String,
    @SerialName("lyric_snippet") val lyricSnippet: String? = null,
    @SerialName("song_title") val songTitle: String? = null,
    @SerialName("artist_name") val artistName: String? = null,
    @SerialName("share_token") val shareToken: String? = null,
    @SerialName("actor_username") val actorUsername: String? = null
)
