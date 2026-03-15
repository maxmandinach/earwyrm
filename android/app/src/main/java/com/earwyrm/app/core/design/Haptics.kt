package com.earwyrm.app.core.design

import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalView

/**
 * Provides haptic feedback helpers for Compose, mirroring ios/Earwyrm/Core/Design/Haptics.swift.
 * Uses View.performHapticFeedback which respects system haptic settings automatically.
 */
class Haptics(private val view: View) {

    /** Light tap -- reactions, saves, follow toggles, pull-to-refresh */
    fun light() {
        view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
    }

    /** Confirm gesture -- successful post, profile save */
    fun success() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
        } else {
            // Fallback for API < 34
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        }
    }

    /** Reject / error gesture */
    fun error() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            view.performHapticFeedback(HapticFeedbackConstants.REJECT)
        } else {
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        }
    }
}

/** Remember a [Haptics] instance scoped to the current composition. */
@Composable
fun rememberHaptics(): Haptics {
    val view = LocalView.current
    return remember(view) { Haptics(view) }
}
