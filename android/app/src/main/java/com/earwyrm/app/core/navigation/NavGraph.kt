package com.earwyrm.app.core.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.navArgument
import com.earwyrm.app.core.design.DmSansFamily
import com.earwyrm.app.core.design.OfflineBanner
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.network.NetworkMonitor
import com.earwyrm.app.core.supabase.NotificationManager
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import androidx.compose.ui.platform.LocalContext
import com.earwyrm.app.feature.activity.ActivityScreen
import com.earwyrm.app.feature.collections.CollectionDetailScreen
import com.earwyrm.app.feature.collections.CollectionsScreen
import com.earwyrm.app.feature.explore.ArtistPage
import com.earwyrm.app.feature.explore.ExploreScreen
import com.earwyrm.app.feature.explore.FollowDiscoveryScreen
import com.earwyrm.app.feature.explore.FullLyricsView
import com.earwyrm.app.feature.explore.SongPage
import com.earwyrm.app.feature.home.HomeScreen
import com.earwyrm.app.feature.postlyric.PostLyricScreen
import com.earwyrm.app.feature.profile.ProfileScreen
import com.earwyrm.app.feature.profile.SettingsScreen
import com.earwyrm.app.feature.share.SharedLyricDetailScreen
import com.earwyrm.app.feature.subscription.PlusPaywallScreen

sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Explore : Screen("explore")
    data object Activity : Screen("activity")
    data object Profile : Screen("profile")
    data object PostLyric : Screen("post_lyric")
    data object Settings : Screen("settings")
    data object Collections : Screen("collections")
    data object CollectionDetail : Screen("collection/{collectionId}") { fun createRoute(id: String) = "collection/$id" }
    data object SongPage : Screen("song/{title}?artist={artist}") {
        fun createRoute(title: String, artist: String?) = "song/${java.net.URLEncoder.encode(title, "UTF-8")}?artist=${java.net.URLEncoder.encode(artist ?: "", "UTF-8")}"
    }
    data object FullLyrics : Screen("full_lyrics/{title}?artist={artist}") {
        fun createRoute(title: String, artist: String?) = "full_lyrics/${java.net.URLEncoder.encode(title, "UTF-8")}?artist=${java.net.URLEncoder.encode(artist ?: "", "UTF-8")}"
    }
    data object PublicProfile : Screen("user/{username}") { fun createRoute(u: String) = "user/$u" }
    data object SharedLyricDetail : Screen("shared_lyric/{shareToken}") { fun createRoute(token: String) = "shared_lyric/$token" }
    data object ArtistPage : Screen("artist/{artistName}") {
        fun createRoute(artistName: String) = "artist/${java.net.URLEncoder.encode(artistName, "UTF-8")}"
    }
    data object PlusPaywall : Screen("plus_paywall")
    data object FollowDiscovery : Screen("follow_discovery")
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface NotificationManagerEntryPoint {
    fun notificationManager(): NotificationManager
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface NetworkMonitorEntryPoint {
    fun networkMonitor(): NetworkMonitor
}

data class TabItem(val screen: Screen, val label: String, val selectedIcon: ImageVector, val unselectedIcon: ImageVector)
val tabItems = listOf(
    TabItem(Screen.Home, "Home", Icons.Filled.Home, Icons.Outlined.Home),
    TabItem(Screen.Explore, "Explore", Icons.Filled.Explore, Icons.Outlined.Explore),
    TabItem(Screen.Activity, "Activity", Icons.Filled.Notifications, Icons.Outlined.Notifications),
    TabItem(Screen.Profile, "Profile", Icons.Filled.Person, Icons.Outlined.Person)
)

@Composable
fun NavGraph(navController: NavHostController, deepLinkDestination: DeepLinkDestination? = null) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val showBottomBar = currentRoute in tabItems.map { it.screen.route }

    val context = LocalContext.current
    val notificationManager = remember {
        EntryPointAccessors.fromApplication(context, NotificationManagerEntryPoint::class.java).notificationManager()
    }
    val networkMonitor = remember {
        EntryPointAccessors.fromApplication(context, NetworkMonitorEntryPoint::class.java).networkMonitor()
    }
    val unreadCount by notificationManager.unreadCount.collectAsState()

    // Handle deep link navigation once navController is ready
    LaunchedEffect(deepLinkDestination) {
        deepLinkDestination?.let { DeepLinkRouter.navigate(navController, it) }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        NavHost(navController = navController, startDestination = Screen.Home.route, modifier = Modifier.fillMaxSize()) {
            composable(Screen.Home.route) { HomeScreen(navController = navController) }
            composable(Screen.Explore.route) { ExploreScreen(navController = navController) }
            composable(Screen.Activity.route) { ActivityScreen(navController = navController) }
            composable(Screen.Profile.route) { ProfileScreen(navController = navController) }
            composable(Screen.PostLyric.route) { PostLyricScreen(navController = navController) }
            composable(Screen.Settings.route) { SettingsScreen(navController = navController) }
            composable(Screen.Collections.route) { CollectionsScreen(navController = navController) }
            composable(Screen.CollectionDetail.route, arguments = listOf(navArgument("collectionId") { type = NavType.StringType })) {
                CollectionDetailScreen(collectionId = it.arguments?.getString("collectionId") ?: return@composable, navController = navController)
            }
            composable(Screen.SongPage.route, arguments = listOf(navArgument("title") { type = NavType.StringType }, navArgument("artist") { type = NavType.StringType; defaultValue = "" })) {
                val t = java.net.URLDecoder.decode(it.arguments?.getString("title") ?: "", "UTF-8")
                val a = java.net.URLDecoder.decode(it.arguments?.getString("artist") ?: "", "UTF-8").ifEmpty { null }
                SongPage(title = t, artist = a, navController = navController)
            }
            composable(Screen.ArtistPage.route, arguments = listOf(navArgument("artistName") { type = NavType.StringType })) {
                val name = java.net.URLDecoder.decode(it.arguments?.getString("artistName") ?: "", "UTF-8")
                ArtistPage(artistName = name, navController = navController)
            }
            composable(Screen.FullLyrics.route, arguments = listOf(navArgument("title") { type = NavType.StringType }, navArgument("artist") { type = NavType.StringType; defaultValue = "" })) {
                val t = java.net.URLDecoder.decode(it.arguments?.getString("title") ?: "", "UTF-8")
                val a = java.net.URLDecoder.decode(it.arguments?.getString("artist") ?: "", "UTF-8").ifEmpty { null }
                FullLyricsView(songTitle = t, artistName = a, navController = navController)
            }
            composable(Screen.PublicProfile.route, arguments = listOf(navArgument("username") { type = NavType.StringType })) {
                ProfileScreen(navController = navController, viewingUsername = it.arguments?.getString("username"))
            }
            composable(Screen.PlusPaywall.route) { PlusPaywallScreen(navController = navController) }
            composable(Screen.FollowDiscovery.route) { FollowDiscoveryScreen(navController = navController) }
            composable(Screen.SharedLyricDetail.route, arguments = listOf(navArgument("shareToken") { type = NavType.StringType })) {
                SharedLyricDetailScreen(shareToken = it.arguments?.getString("shareToken") ?: return@composable, navController = navController)
            }
        }
        AnimatedVisibility(visible = showBottomBar, modifier = Modifier.align(Alignment.BottomCenter), enter = slideInVertically { it }, exit = slideOutVertically { it }) {
            EarwyrmTabBar(navController, currentRoute, unreadCount)
        }
        OfflineBanner(networkMonitor = networkMonitor)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EarwyrmTabBar(navController: NavHostController, currentRoute: String?, unreadCount: Int) {
    Row(modifier = Modifier.fillMaxWidth().background(Theme.card).padding(WindowInsets.navigationBars.asPaddingValues()).padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
        tabItems.forEach { item ->
            val selected = currentRoute == item.screen.route
            val showBadge = item.screen == Screen.Activity && unreadCount > 0
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {
                if (currentRoute != item.screen.route) navController.navigate(item.screen.route) { popUpTo(Screen.Home.route) { saveState = true }; launchSingleTop = true; restoreState = true }
            }.padding(horizontal = 16.dp, vertical = 4.dp)) {
                BadgedBox(
                    badge = {
                        if (showBadge) {
                            Badge(containerColor = Theme.accent, contentColor = Theme.background) {
                                Text(if (unreadCount > 99) "99+" else unreadCount.toString(), fontSize = 9.sp, fontFamily = DmSansFamily, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                ) {
                    Icon(if (selected) item.selectedIcon else item.unselectedIcon, item.label, tint = if (selected) Theme.accent else Theme.textMuted, modifier = Modifier.size(24.dp))
                }
                Text(item.label, fontFamily = DmSansFamily, fontSize = 11.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, color = if (selected) Theme.accent else Theme.textMuted)
            }
        }
    }
}
