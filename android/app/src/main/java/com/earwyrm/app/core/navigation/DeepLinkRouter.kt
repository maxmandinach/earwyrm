package com.earwyrm.app.core.navigation

import android.content.Intent
import android.net.Uri
import androidx.navigation.NavHostController

sealed class DeepLinkDestination {
    data class SharedLyric(val shareToken: String) : DeepLinkDestination()
    data class UserProfile(val username: String) : DeepLinkDestination()
    data class Artist(val name: String) : DeepLinkDestination()
    data class Song(val title: String, val artistName: String?) : DeepLinkDestination()
}

object DeepLinkRouter {
    fun parse(intent: Intent?): DeepLinkDestination? = intent?.data?.let { parse(it) }
    fun parse(uri: Uri): DeepLinkDestination? {
        val p = uri.pathSegments ?: return null
        return when {
            p.size >= 2 && p[0] == "s" -> DeepLinkDestination.SharedLyric(p[1])
            p.size >= 2 && p[0] == "u" -> DeepLinkDestination.UserProfile(p[1])
            p.size >= 2 && p[0] == "artist" -> DeepLinkDestination.Artist(p[1].replace("-", " "))
            p.size >= 2 && p[0] == "song" -> DeepLinkDestination.Song(p[1].replace("-", " "), uri.getQueryParameter("artist"))
            else -> null
        }
    }
    fun navigate(navController: NavHostController, destination: DeepLinkDestination) {
        when (destination) {
            is DeepLinkDestination.SharedLyric -> { }
            is DeepLinkDestination.UserProfile -> navController.navigate(Screen.PublicProfile.createRoute(destination.username))
            is DeepLinkDestination.Artist -> { }
            is DeepLinkDestination.Song -> navController.navigate(Screen.SongPage.createRoute(destination.title, destination.artistName))
        }
    }
}
