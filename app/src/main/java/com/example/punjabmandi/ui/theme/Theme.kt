package com.example.punjabmandi.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = MandiGreenPrimary,
    onPrimary = Color.White,
    primaryContainer = MandiGreenSubtle,
    onPrimaryContainer = MandiGreenDark,
    secondary = WheatGold,
    onSecondary = Color.White,
    secondaryContainer = WheatGoldSubtle,
    onSecondaryContainer = Color(0xFF78350F),
    background = BackgroundLight,
    onBackground = TextDark,
    surface = Color.White,
    onSurface = TextDark,
    outline = CardBorder,
    error = DangerRed,
    onError = Color.White
)

@Composable
fun PunjabMandiTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography,
        content = content
    )
}
