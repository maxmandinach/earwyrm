package com.earwyrm.app.core.model

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EarwyrmCollection(
    val id: String, @SerialName("user_id") val userId: String, val name: String,
    val description: String? = null, val color: String? = null,
    @SerialName("is_smart") val isSmart: Boolean? = null,
    @SerialName("smart_tag") val smartTag: String? = null,
    @SerialName("created_at") val createdAt: Instant,
    @SerialName("updated_at") val updatedAt: Instant? = null
)

@Serializable
data class CollectionInsert(
    @SerialName("user_id") val userId: String, val name: String,
    val description: String? = null, val color: String? = null,
    @SerialName("is_smart") val isSmart: Boolean? = null,
    @SerialName("smart_tag") val smartTag: String? = null
)

@Serializable
data class LyricCollection(
    val id: String, @SerialName("lyric_id") val lyricId: String,
    @SerialName("collection_id") val collectionId: String,
    @SerialName("added_at") val addedAt: Instant
)

@Serializable
data class LyricCollectionInsert(
    @SerialName("lyric_id") val lyricId: String,
    @SerialName("collection_id") val collectionId: String
)
