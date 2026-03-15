package com.earwyrm.app.core.design

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

enum class AppThemeMode { SYSTEM, LIGHT, DARK }

@Singleton
class AppearanceManager @Inject constructor(@ApplicationContext context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("earwyrm_appearance", Context.MODE_PRIVATE)
    private val _themeMode = MutableStateFlow(AppThemeMode.entries.getOrElse(prefs.getInt("theme_mode", 0)) { AppThemeMode.SYSTEM })
    val themeMode: StateFlow<AppThemeMode> = _themeMode
    fun setThemeMode(mode: AppThemeMode) { _themeMode.value = mode; prefs.edit().putInt("theme_mode", mode.ordinal).apply() }
}
