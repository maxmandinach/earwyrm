package com.earwyrm.app.core.design

import androidx.compose.animation.*
import androidx.compose.animation.core.spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun ToastOverlay(toastManager: ToastManager) {
    val toast by toastManager.currentToast.collectAsState()

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.TopCenter
    ) {
        AnimatedVisibility(
            visible = toast != null,
            enter = slideInVertically(
                initialOffsetY = { -it },
                animationSpec = spring(dampingRatio = 0.6f, stiffness = 300f)
            ) + fadeIn(),
            exit = slideOutVertically(
                targetOffsetY = { -it }
            ) + fadeOut()
        ) {
            toast?.let { t ->
                val backgroundColor = when (t.style) {
                    ToastStyle.ERROR -> Theme.error
                    ToastStyle.SUCCESS -> Theme.success
                }
                val icon = when (t.style) {
                    ToastStyle.ERROR -> Icons.Outlined.ErrorOutline
                    ToastStyle.SUCCESS -> Icons.Outlined.CheckCircle
                }

                Surface(
                    modifier = Modifier
                        .padding(
                            top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 8.dp,
                            start = 24.dp,
                            end = 24.dp
                        )
                        .clickable { toastManager.dismiss() },
                    shape = RoundedCornerShape(24.dp),
                    color = backgroundColor.copy(alpha = 0.95f),
                    shadowElevation = 6.dp
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                        Text(
                            text = t.message,
                            style = Theme.dmSans(14f, FontWeight.Medium),
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}
