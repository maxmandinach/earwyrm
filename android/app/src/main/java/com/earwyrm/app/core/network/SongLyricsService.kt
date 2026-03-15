package com.earwyrm.app.core.network

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SongLyricsService @Inject constructor(private val lrclibService: LRCLIBService) {
    suspend fun fetchFullLyrics(title: String, artist: String): String? = lrclibService.getLyrics(title, artist)
}
