package com.earwyrm.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.earwyrm.app.core.auth.AuthGate
import com.earwyrm.app.core.design.EarwyrmTheme
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.ToastManager
import com.earwyrm.app.core.design.ToastOverlay
import com.earwyrm.app.core.subscription.BillingManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var billingManager: BillingManager
    @Inject lateinit var toastManager: ToastManager

    private var currentIntent by mutableStateOf<Intent?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        billingManager.initialize()
        currentIntent = intent
        enableEdgeToEdge()
        setContent {
            EarwyrmTheme {
                Box(modifier = Modifier.fillMaxSize()) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = Theme.background
                    ) {
                        AuthGate(intent = currentIntent)
                    }
                    ToastOverlay(toastManager)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        currentIntent = intent
    }

    override fun onDestroy() {
        super.onDestroy()
        billingManager.destroy()
    }
}
