package com.earwyrm.app.core.model

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Lyric(
    val id: String, @SerialName("user_id") val userId: String, val content: String,
    @SerialName("song_title") val songTitle: String? = null,
    @SerialName("artist_name") val artistName: String? = null,
    @SerialName("cover_art_url") val coverArtUrl: String? = null,
    @SerialName("album_name") val albumName: String? = null,
    @SerialName("is_current") val isCurrent: Boolean? = null,
    @SerialName("is_public") val isPublic: Boolean? = null,
    val tags: List<String>? = null,
    @SerialName("share_token") val shareToken: String? = null,
    @SerialName("canonical_lyric_id") val canonicalLyricId: String? = null,
    @SerialName("musicbrainz_recording_id") val musicbrainzRecordingId: String? = null,
    @SerialName("musicbrainz_release_id") val musicbrainzReleaseId: String? = null,
    @SerialName("reaction_count") val reactionCount: Int? = null,
    @SerialName("comment_count") val commentCount: Int? = null,
    @SerialName("card_art_url") val cardArtUrl: String? = null,
    @SerialName("created_at") val createdAt: Instant,
    @SerialName("replaced_at") val replacedAt: Instant? = null
)

@Serializable
data class LyricInsert(
    @SerialName("user_id") val userId: String, val content: String,
    @SerialName("song_title") val songTitle: String? = null,
    @SerialName("artist_name") val artistName: String? = null,
    @SerialName("cover_art_url") val coverArtUrl: String? = null,
    @SerialName("card_art_url") val cardArtUrl: String? = null,
    @SerialName("album_name") val albumName: String? = null,
    val tags: List<String>? = null,
    @SerialName("is_public") val isPublic: Boolean = true,
    @SerialName("is_current") val isCurrent: Boolean = true,
    @SerialName("canonical_lyric_id") val canonicalLyricId: String? = null,
    @SerialName("musicbrainz_recording_id") val musicbrainzRecordingId: String? = null,
    @SerialName("musicbrainz_release_id") val musicbrainzReleaseId: String? = null
)

@Serializable
data class LyricUpdate(
    val content: String? = null, @SerialName("song_title") val songTitle: String? = null,
    @SerialName("artist_name") val artistName: String? = null,
    @SerialName("cover_art_url") val coverArtUrl: String? = null,
    @SerialName("album_name") val albumName: String? = null,
    val tags: List<String>? = null,
    @SerialName("is_public") val isPublic: Boolean? = null,
    @SerialName("is_current") val isCurrent: Boolean? = null,
    @SerialName("replaced_at") val replacedAt: Instant? = null,
    @SerialName("canonical_lyric_id") val canonicalLyricId: String? = null,
    @SerialName("musicbrainz_recording_id") val musicbrainzRecordingId: String? = null,
    @SerialName("musicbrainz_release_id") val musicbrainzReleaseId: String? = null
)
