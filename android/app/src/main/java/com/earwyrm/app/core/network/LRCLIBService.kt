package com.earwyrm.app.core.network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LRCLIBService @Inject constructor(private val httpClient: HttpClient) {
    suspend fun getLyrics(title: String, artist: String): String? {
        return try {
            val response = httpClient.get("https://lrclib.net/api/get") {
                url { parameters.append("track_name", title); parameters.append("artist_name", artist) }
            }
            val result = response.body<LRCLIBResponse>()
            result.plainLyrics ?: result.syncedLyrics
        } catch (_: Exception) { null }
    }

    @Serializable private data class LRCLIBResponse(@SerialName("plainLyrics") val plainLyrics: String? = null, @SerialName("syncedLyrics") val syncedLyrics: String? = null)
}
