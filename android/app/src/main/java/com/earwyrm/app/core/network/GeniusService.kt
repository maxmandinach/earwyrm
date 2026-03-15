package com.earwyrm.app.core.network

import com.earwyrm.app.core.model.GeniusSearchRequest
import com.earwyrm.app.core.model.GeniusSuggestion
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.call.body
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GeniusService @Inject constructor(private val supabase: SupabaseClient) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun searchByLyrics(lyrics: String): List<GeniusSuggestion> {
        if (lyrics.length < 10) return emptyList()
        return try {
            val response = supabase.functions.invoke(function = "genius-search", body = GeniusSearchRequest(lyrics = lyrics))
            val body = response.body<ByteArray>().decodeToString()
            val parsed = json.decodeFromString<GeniusResponse>(body)
            parsed.results.distinctBy { "${it.title}::${it.artist}".lowercase() }.take(3)
        } catch (_: Exception) { emptyList() }
    }

    @Serializable private data class GeniusResponse(val results: List<GeniusSuggestion> = emptyList())
}
