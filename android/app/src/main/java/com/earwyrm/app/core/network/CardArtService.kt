package com.earwyrm.app.core.network

import com.earwyrm.app.core.model.Lyric
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import io.ktor.client.call.body
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CardArtService @Inject constructor(private val supabase: SupabaseClient) {
    private val json = Json { ignoreUnknownKeys = true }

    sealed class GenerateResult {
        data class Success(val url: String, val remaining: Int, val isFreeTier: Boolean) : GenerateResult()
        data object UpgradeRequired : GenerateResult()
        data class Error(val message: String) : GenerateResult()
    }

    suspend fun generateArt(lyric: Lyric, note: String? = null, refinement: String? = null): GenerateResult {
        return try {
            val request = CardArtRequest(
                lyricContent = lyric.content,
                noteContent = note,
                songTitle = lyric.songTitle,
                artistName = lyric.artistName,
                tags = lyric.tags,
                lyricId = lyric.id,
                refinement = refinement
            )
            val response = supabase.functions.invoke(function = "generate-card-art", body = request)
            val body = response.body<ByteArray>().decodeToString()

            // Check for upgrade-required error
            val errorBody = try { json.decodeFromString<ErrorResponse>(body) } catch (_: Exception) { null }
            if (errorBody?.upgrade == true) return GenerateResult.UpgradeRequired

            val result = json.decodeFromString<CardArtResponse>(body)
            GenerateResult.Success(
                url = result.imageUrl ?: return GenerateResult.Error("No image URL"),
                remaining = result.remaining ?: 0,
                isFreeTier = result.isFreeTier ?: false
            )
        } catch (e: Exception) {
            GenerateResult.Error(e.message ?: "Generation failed")
        }
    }

    suspend fun fetchVariants(lyricId: String): List<ArtVariant> {
        return try {
            supabase.postgrest.from("card_art_generations")
                .select {
                    filter { eq("lyric_id", lyricId); neq("image_url", "null") }
                    order("created_at", Order.DESCENDING)
                }
                .decodeList()
        } catch (_: Exception) { emptyList() }
    }

    suspend fun setActiveVariant(lyricId: String, imageUrl: String) {
        try {
            supabase.postgrest.from("lyrics")
                .update(mapOf("card_art_url" to imageUrl)) { filter { eq("id", lyricId) } }
        } catch (_: Exception) { }
    }

    suspend fun clearActiveVariant(lyricId: String) {
        try {
            supabase.postgrest.from("lyrics")
                .update(mapOf("card_art_url" to null)) { filter { eq("id", lyricId) } }
        } catch (_: Exception) { }
    }

    @Serializable
    data class CardArtRequest(
        @SerialName("lyric_content") val lyricContent: String,
        @SerialName("note_content") val noteContent: String? = null,
        @SerialName("song_title") val songTitle: String? = null,
        @SerialName("artist_name") val artistName: String? = null,
        val tags: List<String>? = null,
        @SerialName("lyric_id") val lyricId: String,
        val refinement: String? = null
    )

    @Serializable
    private data class CardArtResponse(
        @SerialName("image_url") val imageUrl: String? = null,
        val remaining: Int? = null,
        @SerialName("is_free_gen") val isFreeTier: Boolean? = null
    )

    @Serializable
    private data class ErrorResponse(val error: String? = null, val upgrade: Boolean? = null)
}

@Serializable
data class ArtVariant(
    val id: String,
    @SerialName("image_url") val imageUrl: String,
    @SerialName("created_at") val createdAt: String
)
