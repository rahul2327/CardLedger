package com.rahul2327.cardledger.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import com.rahul2327.cardledger.model.CardColorToken
import com.rahul2327.cardledger.model.SpendingCategory
import com.rahul2327.cardledger.model.ThemeMode

@Immutable
data class CardLedgerExtraColors(
    val isDark: Boolean,
    val surfaceLow: Color,
    val surfaceCard: Color,
    val surfaceHigh: Color,
    val success: Color,
    val successContainer: Color,
    val onSuccessContainer: Color,
    val warning: Color,
    val warningContainer: Color,
    val onWarningContainer: Color,
)

private val LightExtraColors = CardLedgerExtraColors(
    isDark = false,
    surfaceLow = Color(0xFFF0F4F9),
    surfaceCard = Color(0xFFFFFFFF),
    surfaceHigh = Color(0xFFE1E8F2),
    success = Color(0xFF146C2E),
    successContainer = Color(0xFFC4EED0),
    onSuccessContainer = Color(0xFF072711),
    warning = Color(0xFFB06000),
    warningContainer = Color(0xFFFFEFC3),
    onWarningContainer = Color(0xFF3E2200),
)

private val DarkExtraColors = CardLedgerExtraColors(
    isDark = true,
    surfaceLow = Color(0xFF1A1B1E),
    surfaceCard = Color(0xFF1E1F20),
    surfaceHigh = Color(0xFF282A2C),
    success = Color(0xFF6DD58C),
    successContainer = Color(0xFF0F5223),
    onSuccessContainer = Color(0xFFC4EED0),
    warning = Color(0xFFFDD663),
    warningContainer = Color(0xFF4B3700),
    onWarningContainer = Color(0xFFFFEFC3),
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF0B57D0),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFD3E3FD),
    onPrimaryContainer = Color(0xFF041E49),
    secondary = Color(0xFF4E5E7A),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFDCE6F7),
    onSecondaryContainer = Color(0xFF0E1D33),
    tertiary = Color(0xFFB06000),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFFFFEFC3),
    onTertiaryContainer = Color(0xFF3E2200),
    error = Color(0xFFB3261E),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFF9DEDC),
    onErrorContainer = Color(0xFF410E0B),
    background = Color(0xFFF8F9FA),
    onBackground = Color(0xFF1F1F1F),
    surface = Color(0xFFF8F9FA),
    onSurface = Color(0xFF1F1F1F),
    surfaceVariant = Color(0xFFE7ECF2),
    onSurfaceVariant = Color(0xFF444746),
    outline = Color(0xFF747775),
    outlineVariant = Color(0xFFDDE3EA),
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFA8C7FA),
    onPrimary = Color(0xFF062E6F),
    primaryContainer = Color(0xFF004A77),
    onPrimaryContainer = Color(0xFFC2E7FF),
    secondary = Color(0xFFB8C7E0),
    onSecondary = Color(0xFF223047),
    secondaryContainer = Color(0xFF394457),
    onSecondaryContainer = Color(0xFFDCE6F7),
    tertiary = Color(0xFFFDD663),
    onTertiary = Color(0xFF3E2200),
    tertiaryContainer = Color(0xFF4B3700),
    onTertiaryContainer = Color(0xFFFFEFC3),
    error = Color(0xFFF2B8B5),
    onError = Color(0xFF601410),
    errorContainer = Color(0xFF690005),
    onErrorContainer = Color(0xFFFFDAD6),
    background = Color(0xFF131314),
    onBackground = Color(0xFFE3E3E3),
    surface = Color(0xFF131314),
    onSurface = Color(0xFFE3E3E3),
    surfaceVariant = Color(0xFF282A2C),
    onSurfaceVariant = Color(0xFFC4C7C5),
    outline = Color(0xFF8E918F),
    outlineVariant = Color(0xFF36383B),
)

val LocalCardLedgerColors = staticCompositionLocalOf { DarkExtraColors }

val MonoFontFamily: FontFamily = FontFamily.Monospace

@Composable
fun CardLedgerTheme(
    themeMode: ThemeMode,
    content: @Composable () -> Unit,
) {
    val systemDark = isSystemInDarkTheme()
    val useDark = when (themeMode) {
        ThemeMode.DARK -> true
        ThemeMode.LIGHT -> false
        ThemeMode.SYSTEM -> systemDark
    }
    val scheme = if (useDark) DarkColorScheme else LightColorScheme
    val extras = if (useDark) DarkExtraColors else LightExtraColors

    CompositionLocalProvider(LocalCardLedgerColors provides extras) {
        MaterialTheme(
            colorScheme = scheme,
            typography = Typography(),
            content = content,
        )
    }
}

fun CardColorToken.swatchColor(isDark: Boolean): Color =
    Color(if (isDark) darkSwatch else lightSwatch)

fun CardColorToken.accentColor(isDark: Boolean): Color =
    Color(if (isDark) darkAccent else lightAccent)

fun CardColorToken.softBgColor(isDark: Boolean): Color =
    Color(if (isDark) darkSoftBg else lightSoftBg)

fun SpendingCategory.chartColor(isDark: Boolean): Color =
    Color(if (isDark) darkColor else lightColor)
