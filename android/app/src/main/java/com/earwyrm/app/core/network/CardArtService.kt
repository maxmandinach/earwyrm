package com.earwyrm.app.core.network

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.call.body
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CardArtService @Inject constructor(private val supabase: SupabaseClient) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun generateCardArt(lyricContent: String, songTitle: String?, artistName: String?): String? {
        return try {
            val response = supabase.functions.invoke(function = "generate-card-art", body = CardArtRequest(lyrics = lyricContent, songTitle = songTitle, artistName = artistName))
            val body = response.body<ByteArray>().decodeToString()
            json.decodeFromString<CardArtResponse>(body).url
        } catch (_: Exception) { null }
    }

    @Serializable private data class CardArtRequest(val lyrics: String, val songTitle: String? = null, val artistName: String? = null)
    @Serializable private data class CardArtResponse(val url: String? = null)
}
