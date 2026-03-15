package com.earwyrm.app.core.model

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Reaction(val id: String, @SerialName("lyric_id") val lyricId: String, @SerialName("user_id") val userId: String, @SerialName("created_at") val createdAt: Instant)

@Serializable
data class ReactionInsert(@SerialName("lyric_id") val lyricId: String, @SerialName("user_id") val userId: String)
