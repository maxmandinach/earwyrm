package com.earwyrm.app.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable data class MBArtist(val id: String, val name: String, val type: String? = null, val country: String? = null, val disambiguation: String? = null, val score: Int? = null)
@Serializable data class MBArtistSearchResponse(val artists: List<MBArtist> = emptyList())
@Serializable data class MBRecording(val id: String, val title: String, val score: Int? = null, val disambiguation: String? = null, @SerialName("artist-credit") val artistCredit: List<MBArtistCredit> = emptyList(), val releases: List<MBRelease> = emptyList())
@Serializable data class MBArtistCredit(val name: String? = null, val artist: MBArtistRef? = null)
@Serializable data class MBArtistRef(val id: String, val name: String)
@Serializable data class MBRelease(val id: String, val title: String? = null, val date: String? = null, @SerialName("release-group") val releaseGroup: MBReleaseGroup? = null)
@Serializable data class MBReleaseGroup(val id: String, @SerialName("primary-type") val primaryType: String? = null, @SerialName("secondary-types") val secondaryTypes: List<String> = emptyList())
@Serializable data class MBRecordingSearchResponse(val recordings: List<MBRecording> = emptyList())
@Serializable data class CoverArtResponse(val images: List<CoverArtImage> = emptyList())
@Serializable data class CoverArtImage(val thumbnails: CoverArtThumbnails? = null, val front: Boolean? = null)
@Serializable data class CoverArtThumbnails(@SerialName("250") val size250: String? = null, val small: String? = null, val large: String? = null)
data class MappedRecording(val id: String, val title: String, val artist: String?, val album: String?, val releaseId: String?, val releaseGroupId: String?, val year: String?, val score: Int)
@Serializable data class GeniusSearchRequest(val lyrics: String)
@Serializable data class GeniusSuggestion(val title: String, val artist: String? = null, @SerialName("albumArt") val albumArt: String? = null, @SerialName("artistImageUrl") val artistImageUrl: String? = null, @SerialName("geniusUrl") val geniusUrl: String? = null)
@Serializable data class ContentReport(@SerialName("reporter_id") val reporterId: String, @SerialName("content_type") val contentType: String, @SerialName("content_id") val contentId: String, val reason: String)
@Serializable data class UserBlock(val id: String, @SerialName("blocker_id") val blockerId: String, @SerialName("blocked_user_id") val blockedUserId: String, @SerialName("created_at") val createdAt: String)
@Serializable data class UserBlockInsert(@SerialName("blocker_id") val blockerId: String, @SerialName("blocked_user_id") val blockedUserId: String)
