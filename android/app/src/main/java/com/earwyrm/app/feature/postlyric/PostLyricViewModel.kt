package com.earwyrm.app.feature.postlyric

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.model.*
import com.earwyrm.app.core.network.GeniusService
import com.earwyrm.app.core.network.LRCLIBService
import com.earwyrm.app.core.network.MusicBrainzService
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import javax.inject.Inject

@HiltViewModel
class PostLyricViewModel @Inject constructor(private val supabase: SupabaseClient, private val authManager: AuthManager, private val musicBrainzService: MusicBrainzService, private val geniusService: GeniusService, private val lrclibService: LRCLIBService) : ViewModel() {
    val content = MutableStateFlow(""); val artistName = MutableStateFlow(""); val songTitle = MutableStateFlow("")
    val tags = MutableStateFlow<List<String>>(emptyList()); val coverArtUrl = MutableStateFlow<String?>(null)
    val albumName = MutableStateFlow<String?>(null); val canonicalLyricId = MutableStateFlow<String?>(null)
    val musicbrainzRecordingId = MutableStateFlow<String?>(null); val musicbrainzReleaseId = MutableStateFlow<String?>(null)
    val noteContent = MutableStateFlow(""); val noteIsPublic = MutableStateFlow(false); val isPublic = MutableStateFlow(true)

    private val _artistSuggestions = MutableStateFlow<List<MBArtist>>(emptyList()); val artistSuggestions: StateFlow<List<MBArtist>> = _artistSuggestions.asStateFlow()
    private val _songSuggestions = MutableStateFlow<List<MappedRecording>>(emptyList()); val songSuggestions: StateFlow<List<MappedRecording>> = _songSuggestions.asStateFlow()
    private val _geniusSuggestions = MutableStateFlow<List<GeniusSuggestion>>(emptyList()); val geniusSuggestions: StateFlow<List<GeniusSuggestion>> = _geniusSuggestions.asStateFlow()
    private val _ghostText = MutableStateFlow<String?>(null); val ghostText: StateFlow<String?> = _ghostText.asStateFlow()
    private val _isSaving = MutableStateFlow(false); val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()
    private val _saveSuccess = MutableStateFlow(false); val saveSuccess: StateFlow<Boolean> = _saveSuccess.asStateFlow()
    private val _isSearchingGenius = MutableStateFlow(false); val isSearchingGenius: StateFlow<Boolean> = _isSearchingGenius.asStateFlow()
    private var selectedArtistId: String? = null; private var geniusJob: Job? = null; private var artistJob: Job? = null; private var songJob: Job? = null

    fun onContentChanged(text: String) {
        if (text.length <= 500) {
            content.value = text
            if (text.length >= 20 && songTitle.value.isBlank()) {
                geniusJob?.cancel()
                geniusJob = viewModelScope.launch {
                    delay(800)
                    _isSearchingGenius.value = true
                    try {
                        _geniusSuggestions.value = geniusService.searchByLyrics(text)
                    } finally {
                        _isSearchingGenius.value = false
                    }
                }
            } else if (text.length < 20) {
                geniusJob?.cancel()
                _geniusSuggestions.value = emptyList()
                _isSearchingGenius.value = false
            }
        }
    }
    fun onArtistChanged(text: String) { artistName.value = text; selectedArtistId = null; artistJob?.cancel(); if (text.length >= 2) artistJob = viewModelScope.launch { delay(400); _artistSuggestions.value = musicBrainzService.searchArtists(text) } else _artistSuggestions.value = emptyList() }
    fun selectArtist(artist: MBArtist) { artistName.value = artist.name; selectedArtistId = artist.id; _artistSuggestions.value = emptyList(); if (songTitle.value.isNotBlank()) searchSongs(songTitle.value) }
    fun onSongTitleChanged(text: String) { songTitle.value = text; songJob?.cancel(); if (text.length >= 2) songJob = viewModelScope.launch { delay(400); searchSongs(text) } else _songSuggestions.value = emptyList() }
    private fun searchSongs(query: String) { viewModelScope.launch { _songSuggestions.value = musicBrainzService.searchRecordings(query, selectedArtistId) } }

    fun selectSong(recording: MappedRecording) {
        songTitle.value = recording.title; recording.artist?.let { artistName.value = it }; albumName.value = recording.album
        musicbrainzRecordingId.value = recording.id; musicbrainzReleaseId.value = recording.releaseId; _songSuggestions.value = emptyList()
        viewModelScope.launch { coverArtUrl.value = musicBrainzService.fetchCoverArt(recording.releaseGroupId, recording.releaseId) }
        if (recording.title.isNotBlank() && (recording.artist ?: artistName.value).isNotBlank()) viewModelScope.launch { _ghostText.value = lrclibService.getLyrics(recording.title, recording.artist ?: artistName.value) }
    }

    fun selectGeniusSuggestion(s: GeniusSuggestion) {
        songTitle.value = s.title; s.artist?.let { artistName.value = it }; s.albumArt?.let { coverArtUrl.value = it }; _geniusSuggestions.value = emptyList()
        viewModelScope.launch { val r = musicBrainzService.searchRecordings(s.title, limit = 5).firstOrNull(); if (r != null) { musicbrainzRecordingId.value = r.id; musicbrainzReleaseId.value = r.releaseId; if (coverArtUrl.value == null) coverArtUrl.value = musicBrainzService.fetchCoverArt(r.releaseGroupId, r.releaseId) } }
    }

    fun addTag(tag: String) { val t = tag.trim().lowercase(); if (t.isNotBlank() && t !in tags.value) tags.value = tags.value + t }
    fun removeTag(tag: String) { tags.value = tags.value - tag }

    // Full lyrics browsing
    private val _fullLyrics = MutableStateFlow<String?>(null); val fullLyrics: StateFlow<String?> = _fullLyrics.asStateFlow()
    private val _isFetchingLyrics = MutableStateFlow(false); val isFetchingLyrics: StateFlow<Boolean> = _isFetchingLyrics.asStateFlow()
    fun fetchFullLyrics() {
        val title = songTitle.value; val artist = artistName.value
        if (title.isBlank() || artist.isBlank()) return
        viewModelScope.launch {
            _isFetchingLyrics.value = true
            try { _fullLyrics.value = lrclibService.getLyrics(title, artist) } catch (_: Exception) { _fullLyrics.value = null }
            finally { _isFetchingLyrics.value = false }
        }
    }
    fun clearFullLyrics() { _fullLyrics.value = null }

    // Silent save for art generation — saves lyric first, returns it
    private val _savedLyric = MutableStateFlow<Lyric?>(null)
    val savedLyric: StateFlow<Lyric?> = _savedLyric.asStateFlow()

    suspend fun silentSave(): Lyric? {
        if (_savedLyric.value != null) return _savedLyric.value
        val userId = authManager.userId ?: return null
        if (content.value.isBlank()) return null
        return try {
            supabase.postgrest.from("lyrics").update(LyricUpdate(isCurrent = false, replacedAt = Clock.System.now())) { filter { eq("user_id", userId); eq("is_current", true) } }
            val newLyric = supabase.postgrest.from("lyrics").insert(LyricInsert(userId, content.value, songTitle.value.ifBlank { null }, artistName.value.ifBlank { null }, coverArtUrl.value, null, albumName.value, tags.value.ifEmpty { null }, isPublic.value, true, canonicalLyricId.value, musicbrainzRecordingId.value, musicbrainzReleaseId.value)) { select() }.decodeSingle<Lyric>()
            if (noteContent.value.isNotBlank()) supabase.postgrest.from("lyric_notes").upsert(LyricNoteUpsert(newLyric.id, userId, noteContent.value.take(500), noteIsPublic.value))
            _savedLyric.value = newLyric
            newLyric
        } catch (_: Exception) { null }
    }

    fun save() {
        val userId = authManager.userId ?: return; if (content.value.isBlank()) return
        viewModelScope.launch {
            _isSaving.value = true
            try {
                if (_savedLyric.value != null) {
                    // Already saved via silent save (art generation) — just mark success
                    _saveSuccess.value = true
                } else {
                    supabase.postgrest.from("lyrics").update(LyricUpdate(isCurrent = false, replacedAt = Clock.System.now())) { filter { eq("user_id", userId); eq("is_current", true) } }
                    val newLyric = supabase.postgrest.from("lyrics").insert(LyricInsert(userId, content.value, songTitle.value.ifBlank { null }, artistName.value.ifBlank { null }, coverArtUrl.value, null, albumName.value, tags.value.ifEmpty { null }, isPublic.value, true, canonicalLyricId.value, musicbrainzRecordingId.value, musicbrainzReleaseId.value)) { select() }.decodeSingle<Lyric>()
                    if (noteContent.value.isNotBlank()) supabase.postgrest.from("lyric_notes").upsert(LyricNoteUpsert(newLyric.id, userId, noteContent.value.take(500), noteIsPublic.value))
                    _savedLyric.value = newLyric
                    _saveSuccess.value = true
                }
            } catch (_: Exception) { } finally { _isSaving.value = false }
        }
    }
}
