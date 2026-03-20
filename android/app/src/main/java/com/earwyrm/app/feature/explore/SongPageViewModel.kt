package com.earwyrm.app.feature.explore

import androidx.lifecycle.ViewModel
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.Profile
import com.earwyrm.app.core.supabase.BlockManager
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import javax.inject.Inject

@HiltViewModel
class SongPageViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    private val authManager: AuthManager,
    private val blockManager: BlockManager
) : ViewModel() {

    fun getBlockManager(): BlockManager = blockManager
    fun getReporterId(): String? = authManager.userId

    suspend fun fetchSongLyrics(
        title: String,
        artist: String?
    ): Pair<List<Lyric>, Map<String, Profile>> {
        return try {
            val lyrics = supabase.postgrest.from("lyrics")
                .select {
                    filter {
                        eq("is_public", true)
                        eq("song_title", title)
                        if (artist != null) eq("artist_name", artist)
                    }
                    order("created_at", Order.DESCENDING)
                }
                .decodeList<Lyric>()

            val userIds = lyrics.map { it.userId }.distinct()
            val profiles = if (userIds.isNotEmpty()) {
                supabase.postgrest.from("profiles")
                    .select { filter { isIn("id", userIds) } }
                    .decodeList<Profile>()
                    .associateBy { it.id }
            } else emptyMap()

            lyrics to profiles
        } catch (_: Exception) {
            emptyList<Lyric>() to emptyMap()
        }
    }
}
