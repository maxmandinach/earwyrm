package com.earwyrm.app.core.model

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LyricNote(val id: String, @SerialName("lyric_id") val lyricId: String, @SerialName("user_id") val userId: String, val content: String, @SerialName("is_public") val isPublic: Boolean? = null, @SerialName("created_at") val createdAt: Instant, @SerialName("updated_at") val updatedAt: Instant? = null)
@Serializable
data class LyricNoteUpsert(@SerialName("lyric_id") val lyricId: String, @SerialName("user_id") val userId: String, val content: String, @SerialName("is_public") val isPublic: Boolean = false)
