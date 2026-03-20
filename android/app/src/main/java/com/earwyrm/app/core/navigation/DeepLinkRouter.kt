package com.earwyrm.app.core.navigation

import android.content.Intent
import android.net.Uri
import androidx.navigation.NavHostController
import java.net.URLDecoder

sealed class DeepLinkDestination {
    data class SharedLyric(val shareToken: String) : DeepLinkDestination()
    data class UserProfile(val username: String) : DeepLinkDestination()
    data class Artist(val name: String) : DeepLinkDestination()
    data class Song(val title: String, val artistName: String?) : DeepLinkDestination()
}

object DeepLinkRouter {

    fun parse(intent: Intent?): DeepLinkDestination? {
        if (intent?.action != Intent.ACTION_VIEW) return null
        return intent.data?.let { parse(it) }
    }

    fun parse(uri: Uri): DeepLinkDestination? {
        val p = uri.pathSegments ?: return null
        return when {
            // /s/{shareToken}
            p.size >= 2 && p[0] == "s" -> DeepLinkDestination.SharedLyric(p[1])
            // /u/{username}
            p.size >= 2 && p[0] == "u" -> DeepLinkDestination.UserProfile(p[1])
            // /artist/{slug}
            p.size >= 2 && p[0] == "artist" -> DeepLinkDestination.Artist(slugToName(p[1]))
            // /song/{title}/{artist} (two path segments)
            p.size >= 3 && p[0] == "song" -> DeepLinkDestination.Song(
                slugToName(p[1]),
                slugToName(p[2])
            )
            // /song/{title}?artist={artist} (query param variant, for web URL compat)
            p.size >= 2 && p[0] == "song" -> DeepLinkDestination.Song(
                slugToName(p[1]),
                uri.getQueryParameter("artist")?.let { URLDecoder.decode(it, "UTF-8") }
            )
            else -> null
        }
    }

    fun navigate(navController: NavHostController, destination: DeepLinkDestination) {
        when (destination) {
            is DeepLinkDestination.SharedLyric -> navController.navigate(
                Screen.SharedLyricDetail.createRoute(destination.shareToken)
            ) { launchSingleTop = true }
            is DeepLinkDestination.UserProfile -> navController.navigate(
                Screen.PublicProfile.createRoute(destination.username)
            ) { launchSingleTop = true }
            is DeepLinkDestination.Artist -> { /* Not yet supported */ }
            is DeepLinkDestination.Song -> navController.navigate(
                Screen.SongPage.createRoute(destination.title, destination.artistName)
            ) { launchSingleTop = true }
        }
    }

    private fun slugToName(slug: String): String {
        return try {
            URLDecoder.decode(slug, "UTF-8").replace("-", " ")
        } catch (_: Exception) {
            slug.replace("-", " ")
        }
    }
}
