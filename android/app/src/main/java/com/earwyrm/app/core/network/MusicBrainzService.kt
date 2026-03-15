package com.earwyrm.app.core.network

import com.earwyrm.app.core.model.*
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.header
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MusicBrainzService @Inject constructor(private val httpClient: HttpClient) {
    private val baseUrl = "https://musicbrainz.org/ws/2"
    private val coverArtUrl = "https://coverartarchive.org"
    private val rateMutex = Mutex()
    private var lastRequestTime = 0L

    private suspend fun rateLimited(block: suspend () -> Unit) {
        rateMutex.withLock {
            val elapsed = System.currentTimeMillis() - lastRequestTime
            if (elapsed < 1100) delay(1100 - elapsed)
            block()
            lastRequestTime = System.currentTimeMillis()
        }
    }

    suspend fun searchArtists(query: String, limit: Int = 10): List<MBArtist> {
        var result = emptyList<MBArtist>()
        rateLimited {
            val response = httpClient.get("$baseUrl/artist") {
                url { parameters.append("query", query); parameters.append("fmt", "json"); parameters.append("limit", limit.toString()) }
                header("User-Agent", "Earwyrm/1.0.0 (android)")
            }
            result = response.body<MBArtistSearchResponse>().artists
        }
        return result
    }

    suspend fun searchRecordings(query: String, artistId: String? = null, limit: Int = 25): List<MappedRecording> {
        val all = mutableListOf<MappedRecording>()
        val searchQuery = if (artistId != null) "arid:$artistId AND recording:\"$query\"" else query
        rateLimited {
            try {
                val response = httpClient.get("$baseUrl/recording") {
                    url { parameters.append("query", "$searchQuery NOT secondarytype:live"); parameters.append("fmt", "json"); parameters.append("limit", limit.toString()) }
                    header("User-Agent", "Earwyrm/1.0.0 (android)")
                }
                all.addAll(response.body<MBRecordingSearchResponse>().recordings.map { it.toMapped() })
            } catch (_: Exception) { }
        }
        if (all.isEmpty()) {
            rateLimited {
                try {
                    val response = httpClient.get("$baseUrl/recording") {
                        url { parameters.append("query", searchQuery); parameters.append("fmt", "json"); parameters.append("limit", limit.toString()) }
                        header("User-Agent", "Earwyrm/1.0.0 (android)")
                    }
                    all.addAll(response.body<MBRecordingSearchResponse>().recordings.map { it.toMapped() })
                } catch (_: Exception) { }
            }
        }
        return all.groupBy { it.title.lowercase() }.map { (_, group) -> group.maxByOrNull { it.score } ?: group.first() }.sortedByDescending { it.score }
    }

    suspend fun fetchCoverArt(releaseGroupId: String?, releaseId: String?): String? {
        val id = releaseGroupId ?: releaseId ?: return null
        val type = if (releaseGroupId != null) "release-group" else "release"
        return try {
            var url: String? = null
            rateLimited {
                val response = httpClient.get("$coverArtUrl/$type/$id")
                val coverArt = response.body<CoverArtResponse>()
                val img = coverArt.images.firstOrNull { it.front == true } ?: coverArt.images.firstOrNull()
                url = img?.thumbnails?.size250 ?: img?.thumbnails?.small
            }
            url
        } catch (_: Exception) { null }
    }

    private fun MBRecording.toMapped(): MappedRecording {
        val artistName = artistCredit.firstOrNull()?.let { it.name ?: it.artist?.name }
        val release = releases.firstOrNull()
        return MappedRecording(id = id, title = title, artist = artistName, album = release?.title, releaseId = release?.id, releaseGroupId = release?.releaseGroup?.id, year = release?.date?.take(4), score = score ?: 0)
    }
}
