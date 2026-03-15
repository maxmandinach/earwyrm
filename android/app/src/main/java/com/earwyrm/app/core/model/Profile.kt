package com.earwyrm.app.core.model

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Profile(
    val id: String, val username: String,
    @SerialName("display_name") val displayName: String? = null,
    val bio: String? = null, @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("is_public") val isPublic: Boolean? = null,
    @SerialName("last_activity_seen_at") val lastActivitySeenAt: Instant? = null,
    @SerialName("created_at") val createdAt: Instant? = null,
    @SerialName("updated_at") val updatedAt: Instant? = null,
    @SerialName("subscription_tier") val subscriptionTier: String? = null,
    @SerialName("subscription_expires_at") val subscriptionExpiresAt: Instant? = null
) {
    val isPlus: Boolean get() = subscriptionTier == "plus"
}
