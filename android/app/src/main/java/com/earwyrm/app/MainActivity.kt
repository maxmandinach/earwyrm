package com.earwyrm.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.earwyrm.app.core.auth.AuthGate
import com.earwyrm.app.core.design.EarwyrmTheme
import com.earwyrm.app.core.design.Theme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EarwyrmTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Theme.background
                ) {
                    AuthGate(intent = intent)
                }
            }
        }
    }
}
