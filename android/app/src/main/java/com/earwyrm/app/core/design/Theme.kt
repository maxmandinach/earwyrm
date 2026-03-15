package com.earwyrm.app.core.design

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.earwyrm.app.R

val CaveatFamily = FontFamily(
    Font(R.font.caveat_medium, FontWeight.Medium),
    Font(R.font.caveat_semibold, FontWeight.SemiBold),
    Font(R.font.caveat_bold, FontWeight.Bold)
)

val DmSansFamily = FontFamily(
    Font(R.font.dm_sans_regular, FontWeight.Normal),
    Font(R.font.dm_sans_medium, FontWeight.Medium),
    Font(R.font.dm_sans_semibold, FontWeight.SemiBold),
    Font(R.font.dm_sans_bold, FontWeight.Bold),
    Font(R.font.dm_sans_italic, FontWeight.Normal, FontStyle.Italic)
)

object EarwyrmColors {
    val lightBackground = Color(0xFFFAF8F5)
    val lightCard = Color(0xFFFFFFFF)
    val lightTextPrimary = Color(0xFF1A1A1A)
    val lightTextSecondary = Color(0xFF6B6B6B)
    val lightTextMuted = Color(0xFF9B9B9B)
    val lightDivider = Color(0xFFE8E4DF)
    val darkBackground = Color(0xFF1A1816)
    val darkCard = Color(0xFF262320)
    val darkTextPrimary = Color(0xFFF5F0EB)
    val darkTextSecondary = Color(0xFFA09890)
    val darkTextMuted = Color(0xFF6B6360)
    val darkDivider = Color(0xFF3A3530)
    val accent = Color(0xFFB8A99A)
    val accentLight = Color(0xFFD4C8BC)
    val error = Color(0xFFDC3545)
    val success = Color(0xFF28A745)
}

data class EarwyrmColorScheme(
    val background: Color,
    val card: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val accent: Color,
    val divider: Color,
    val error: Color,
    val success: Color
)

val LocalEarwyrmColors = staticCompositionLocalOf {
    EarwyrmColorScheme(
        background = EarwyrmColors.lightBackground,
        card = EarwyrmColors.lightCard,
        textPrimary = EarwyrmColors.lightTextPrimary,
        textSecondary = EarwyrmColors.lightTextSecondary,
        textMuted = EarwyrmColors.lightTextMuted,
        accent = EarwyrmColors.accent,
        divider = EarwyrmColors.lightDivider,
        error = EarwyrmColors.error,
        success = EarwyrmColors.success
    )
}

object Theme {
    val background: Color @Composable @ReadOnlyComposable get() = LocalEarwyrmColors.current.background
    val card: Color @Composable @ReadOnlyComposable get() = LocalEarwyrmColors.current.card
    val textPrimary: Color @Composable @ReadOnlyComposable get() = LocalEarwyrmColors.current.textPrimary
    val textSecondary: Color @Composable @ReadOnlyComposable get() = LocalEarwyrmColors.current.textSecondary
    val textMuted: Color @Composable @ReadOnlyComposable get() = LocalEarwyrmColors.current.textMuted
    val accent: Color @Composable @ReadOnlyComposable get() = LocalEarwyrmColors.current.accent
    val divider: Color @Composable @ReadOnlyComposable get() = LocalEarwyrmColors.current.divider
    val error: Color @Composable @ReadOnlyComposable get() = LocalEarwyrmColors.current.error
    val success: Color @Composable @ReadOnlyComposable get() = LocalEarwyrmColors.current.success

    val spacingXs = 4.dp; val spacingSm = 8.dp; val spacingMd = 16.dp
    val spacingLg = 24.dp; val spacingXl = 32.dp; val spacingXxl = 48.dp
    val cardShadowColor = Color.Black.copy(alpha = 0.08f)
    val cardShadowRadius = 12.dp; val cardShadowY = 4.dp

    fun caveat(size: Float, weight: FontWeight = FontWeight.Medium) = TextStyle(
        fontFamily = CaveatFamily, fontSize = size.sp, fontWeight = weight
    )
    fun dmSans(size: Float, weight: FontWeight = FontWeight.Normal) = TextStyle(
        fontFamily = DmSansFamily, fontSize = size.sp, fontWeight = weight
    )
    fun dmSansItalic(size: Float) = TextStyle(
        fontFamily = DmSansFamily, fontSize = size.sp, fontWeight = FontWeight.Normal, fontStyle = FontStyle.Italic
    )
}

private val LightColorScheme = lightColorScheme(
    primary = EarwyrmColors.accent, onPrimary = Color.White,
    surface = EarwyrmColors.lightCard, onSurface = EarwyrmColors.lightTextPrimary,
    background = EarwyrmColors.lightBackground, onBackground = EarwyrmColors.lightTextPrimary,
    outline = EarwyrmColors.lightDivider, error = EarwyrmColors.error, onError = Color.White
)

private val DarkColorScheme = darkColorScheme(
    primary = EarwyrmColors.accent, onPrimary = Color.White,
    surface = EarwyrmColors.darkCard, onSurface = EarwyrmColors.darkTextPrimary,
    background = EarwyrmColors.darkBackground, onBackground = EarwyrmColors.darkTextPrimary,
    outline = EarwyrmColors.darkDivider, error = EarwyrmColors.error, onError = Color.White
)

@Composable
fun EarwyrmTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val earwyrmColors = if (darkTheme) EarwyrmColorScheme(
        EarwyrmColors.darkBackground, EarwyrmColors.darkCard, EarwyrmColors.darkTextPrimary,
        EarwyrmColors.darkTextSecondary, EarwyrmColors.darkTextMuted, EarwyrmColors.accent,
        EarwyrmColors.darkDivider, EarwyrmColors.error, EarwyrmColors.success
    ) else EarwyrmColorScheme(
        EarwyrmColors.lightBackground, EarwyrmColors.lightCard, EarwyrmColors.lightTextPrimary,
        EarwyrmColors.lightTextSecondary, EarwyrmColors.lightTextMuted, EarwyrmColors.accent,
        EarwyrmColors.lightDivider, EarwyrmColors.error, EarwyrmColors.success
    )
    CompositionLocalProvider(LocalEarwyrmColors provides earwyrmColors) {
        MaterialTheme(colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme, content = content)
    }
}
