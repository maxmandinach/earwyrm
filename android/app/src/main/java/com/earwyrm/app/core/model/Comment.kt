package com.earwyrm.app.core.model

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Comment(
    val id: String, @SerialName("lyric_id") val lyricId: String,
    @SerialName("user_id") val userId: String, val content: String,
    @SerialName("parent_comment_id") val parentCommentId: String? = null,
    @SerialName("created_at") val createdAt: Instant
)

@Serializable
data class CommentInsert(
    @SerialName("lyric_id") val lyricId: String, @SerialName("user_id") val userId: String,
    val content: String, @SerialName("parent_comment_id") val parentCommentId: String? = null
)
