package com.earwyrm.app.core.auth

import android.content.Intent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.navigation.NavGraph
import com.earwyrm.app.feature.auth.LoginScreen

@Composable
fun AuthGate(
    intent: Intent? = null,
    authManager: AuthManager = hiltViewModel<AuthGateViewModel>().authManager
) {
    val isLoading by authManager.isLoading.collectAsState()
    val session by authManager.session.collectAsState()

    when {
        isLoading -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Theme.accent)
            }
        }
        session != null -> {
            val navController = rememberNavController()
            NavGraph(navController = navController)
        }
        else -> {
            LoginScreen()
        }
    }
}
