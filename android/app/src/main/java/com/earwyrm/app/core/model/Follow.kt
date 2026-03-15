package com.earwyrm.app.core.model

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Follow(val id: String, @SerialName("user_id") val userId: String, @SerialName("filter_type") val filterType: String, @SerialName("filter_value") val filterValue: String, @SerialName("created_at") val createdAt: Instant)
@Serializable
data class FollowInsert(@SerialName("user_id") val userId: String, @SerialName("filter_type") val filterType: String, @SerialName("filter_value") val filterValue: String)
@Serializable
data class UserFollow(val id: String, @SerialName("follower_id") val followerId: String, @SerialName("following_id") val followingId: String, @SerialName("created_at") val createdAt: Instant)
@Serializable
data class UserFollowInsert(@SerialName("follower_id") val followerId: String, @SerialName("following_id") val followingId: String)
