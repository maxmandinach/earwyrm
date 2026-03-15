package com.earwyrm.app.core.supabase

import com.earwyrm.app.core.model.*
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CollectionManager @Inject constructor(private val supabase: SupabaseClient) {
    private val _collections = MutableStateFlow<List<EarwyrmCollection>>(emptyList())
    val collections: StateFlow<List<EarwyrmCollection>> = _collections.asStateFlow()
    private val _savedLyricIds = MutableStateFlow<Set<String>>(emptySet())
    val savedLyricIds: StateFlow<Set<String>> = _savedLyricIds.asStateFlow()

    suspend fun fetchCollections(userId: String) { try { _collections.value = supabase.postgrest.from("collections").select { filter { eq("user_id", userId) }; order("created_at", Order.DESCENDING) }.decodeList() } catch (_: Exception) { } }
    suspend fun createCollection(insert: CollectionInsert): EarwyrmCollection? { return try { val r = supabase.postgrest.from("collections").insert(insert) { select() }.decodeSingle<EarwyrmCollection>(); _collections.value = listOf(r) + _collections.value; r } catch (_: Exception) { null } }
    suspend fun deleteCollection(collectionId: String) { try { supabase.postgrest.from("collections").delete { filter { eq("id", collectionId) } }; _collections.value = _collections.value.filter { it.id != collectionId } } catch (_: Exception) { } }
    suspend fun fetchLyricsInCollection(collectionId: String, collection: EarwyrmCollection): List<Lyric> {
        return try {
            if (collection.isSmart == true && collection.smartTag != null) {
                supabase.postgrest.from("lyrics").select { filter { contains("tags", listOf(collection.smartTag)) } }.decodeList()
            } else {
                val assoc = supabase.postgrest.from("lyric_collections").select { filter { eq("collection_id", collectionId) } }.decodeList<LyricCollection>()
                val ids = assoc.map { it.lyricId }
                if (ids.isEmpty()) emptyList() else supabase.postgrest.from("lyrics").select { filter { isIn("id", ids) } }.decodeList()
            }
        } catch (_: Exception) { emptyList() }
    }
    suspend fun addLyricToCollection(lyricId: String, collectionId: String) { try { supabase.postgrest.from("lyric_collections").insert(LyricCollectionInsert(lyricId, collectionId)); _savedLyricIds.value = _savedLyricIds.value + lyricId } catch (_: Exception) { } }
    suspend fun removeLyricFromCollection(lyricId: String, collectionId: String) { try { supabase.postgrest.from("lyric_collections").delete { filter { eq("lyric_id", lyricId); eq("collection_id", collectionId) } } } catch (_: Exception) { } }
}
