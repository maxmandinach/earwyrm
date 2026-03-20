package com.earwyrm.app.core.auth

import android.content.Intent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.navigation.DeepLinkRouter
import com.earwyrm.app.core.navigation.NavGraph
import com.earwyrm.app.core.supabase.FollowManager
import com.earwyrm.app.feature.auth.LoginScreen
import com.earwyrm.app.feature.onboarding.InterestPickerSheet
import com.earwyrm.app.feature.onboarding.hasSeenInterestPicker
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@EntryPoint
@InstallIn(SingletonComponent::class)
interface FollowManagerEntryPoint {
    fun followManager(): FollowManager
}

@Composable
fun AuthGate(
    intent: Intent? = null,
    authManager: AuthManager = hiltViewModel<AuthGateViewModel>().authManager
) {
    val context = LocalContext.current
    val isLoading by authManager.isLoading.collectAsState()
    val session by authManager.session.collectAsState()

    // Track whether to show the interest picker
    var showInterestPicker by remember { mutableStateOf(false) }

    // Check on first auth
    val hasCheckedOnboarding = remember { mutableStateOf(false) }
    if (session != null && !hasCheckedOnboarding.value) {
        hasCheckedOnboarding.value = true
        if (!hasSeenInterestPicker(context)) {
            showInterestPicker = true
        }
    }

    when {
        isLoading -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Theme.accent)
            }
        }
        session != null && showInterestPicker -> {
            val followManager = remember {
                EntryPointAccessors.fromApplication(context, FollowManagerEntryPoint::class.java).followManager()
            }
            InterestPickerSheet(
                authManager = authManager,
                followManager = followManager,
                onDismiss = { showInterestPicker = false }
            )
        }
        session != null -> {
            val navController = rememberNavController()
            val deepLinkDestination = remember(intent) { DeepLinkRouter.parse(intent) }
            NavGraph(navController = navController, deepLinkDestination = deepLinkDestination)
        }
        else -> {
            LoginScreen()
        }
    }
}
