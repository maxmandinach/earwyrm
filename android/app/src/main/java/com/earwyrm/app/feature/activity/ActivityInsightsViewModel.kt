package com.earwyrm.app.feature.activity

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.Reaction
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import javax.inject.Inject
import kotlin.math.abs
import kotlin.time.Duration.Companion.days

@HiltViewModel
class ActivityInsightsViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    private val authManager: AuthManager
) : ViewModel() {

    private val _lyricsThisWeek = MutableStateFlow(0)
    val lyricsThisWeek: StateFlow<Int> = _lyricsThisWeek.asStateFlow()

    private val _resonancesThisWeek = MutableStateFlow(0)
    val resonancesThisWeek: StateFlow<Int> = _resonancesThisWeek.asStateFlow()

    private val _onThisDayLyric = MutableStateFlow<Lyric?>(null)
    val onThisDayLyric: StateFlow<Lyric?> = _onThisDayLyric.asStateFlow()

    private val _onThisDayLabel = MutableStateFlow<String?>(null)
    val onThisDayLabel: StateFlow<String?> = _onThisDayLabel.asStateFlow()

    private val _hasAnythingToShow = MutableStateFlow(false)
    val hasAnythingToShow: StateFlow<Boolean> = _hasAnythingToShow.asStateFlow()

    init {
        loadInsights()
    }

    fun loadInsights() {
        viewModelScope.launch {
            val userId = authManager.userId ?: return@launch
            launch { fetchWeeklyStats(userId) }
            launch { fetchOnThisDay(userId) }
        }
    }

    private suspend fun fetchWeeklyStats(userId: String) {
        val cutoff = (Clock.System.now() - 7.days).toString()

        // Lyrics posted this week
        try {
            val lyrics = supabase.postgrest.from("lyrics")
                .select {
                    filter {
                        eq("user_id", userId)
                        gte("created_at", cutoff)
                    }
                }
                .decodeList<Lyric>()
            _lyricsThisWeek.value = lyrics.size
            updateHasAnything()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Resonances received this week on user's lyrics (excluding self-reactions)
        try {
            // First get user's lyric IDs
            val userLyrics = supabase.postgrest.from("lyrics")
                .select {
                    filter { eq("user_id", userId) }
                }
                .decodeList<Lyric>()
            val lyricIds = userLyrics.map { it.id }

            if (lyricIds.isNotEmpty()) {
                val reactions = supabase.postgrest.from("reactions")
                    .select {
                        filter {
                            isIn("lyric_id", lyricIds)
                            gte("created_at", cutoff)
                            neq("user_id", userId)
                        }
                    }
                    .decodeList<Reaction>()
                _resonancesThisWeek.value = reactions.size
                updateHasAnything()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private suspend fun fetchOnThisDay(userId: String) {
        try {
            val lyrics = supabase.postgrest.from("lyrics")
                .select {
                    filter { eq("user_id", userId) }
                    order("created_at", Order.ASCENDING)
                    limit(200)
                }
                .decodeList<Lyric>()

            val tz = TimeZone.currentSystemDefault()
            val now = Clock.System.now()
            val todayLocal = now.toLocalDateTime(tz)
            val todayMonth = todayLocal.monthNumber
            val todayDay = todayLocal.dayOfMonth
            val todayYear = todayLocal.year

            for (lyric in lyrics) {
                val lyricLocal = lyric.createdAt.toLocalDateTime(tz)

                // Skip lyrics from this same month+year
                if (lyricLocal.year == todayYear && lyricLocal.monthNumber == todayMonth) {
                    continue
                }

                // Check same month and +/-1 day tolerance
                if (lyricLocal.monthNumber == todayMonth &&
                    abs(todayDay - lyricLocal.dayOfMonth) <= 1
                ) {
                    _onThisDayLyric.value = lyric
                    _onThisDayLabel.value = buildLabel(lyricLocal.year, lyricLocal.monthNumber, todayYear, todayMonth)
                    updateHasAnything()
                    return
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun buildLabel(lyricYear: Int, lyricMonth: Int, nowYear: Int, nowMonth: Int): String {
        val totalMonths = (nowYear - lyricYear) * 12 + (nowMonth - lyricMonth)
        val years = totalMonths / 12
        val months = totalMonths % 12

        return when {
            years >= 1 -> if (years == 1) "1 year ago, you saved\u2026" else "$years years ago, you saved\u2026"
            months >= 1 -> if (months == 1) "1 month ago, you saved\u2026" else "$months months ago, you saved\u2026"
            else -> "a while back, you saved\u2026"
        }
    }

    private fun updateHasAnything() {
        _hasAnythingToShow.value = _lyricsThisWeek.value > 0 ||
                _resonancesThisWeek.value > 0 ||
                _onThisDayLyric.value != null
    }
}
