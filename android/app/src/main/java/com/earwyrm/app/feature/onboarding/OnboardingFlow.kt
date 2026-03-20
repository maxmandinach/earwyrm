package com.earwyrm.app.feature.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.DmSansFamily
import com.earwyrm.app.core.design.Theme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.sin

// ──────────────────────────────────────────────────────────────────
// OnboardingFlow — 6-page flow matching iOS experience
// Page 0: Splash  |  Pages 1-5: Tour
// ──────────────────────────────────────────────────────────────────

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingFlow(onComplete: () -> Unit) {
    val totalPages = 6 // 1 splash + 5 tour
    val pagerState = rememberPagerState(pageCount = { totalPages })
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Theme.background)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
            userScrollEnabled = pagerState.currentPage > 0 // disable swipe on splash
        ) { page ->
            when (page) {
                0 -> SplashPage(
                    onGetStarted = {
                        scope.launch { pagerState.animateScrollToPage(1) }
                    }
                )
                1 -> TourPage(
                    isActive = pagerState.currentPage == 1,
                    tagline = "post a lyric",
                    subtitle = "share what's stuck in your head.",
                    animation = { active -> PostLyricAnimation(active) }
                )
                2 -> TourPage(
                    isActive = pagerState.currentPage == 2,
                    tagline = "discover & connect",
                    subtitle = "explore what others are hearing.",
                    animation = { active -> DiscoverConnectAnimation(active) }
                )
                3 -> TourPage(
                    isActive = pagerState.currentPage == 3,
                    tagline = "memory lane",
                    subtitle = "your musical memory lane.",
                    animation = { active -> MemoryLaneAnimation(active) }
                )
                4 -> TourPage(
                    isActive = pagerState.currentPage == 4,
                    tagline = "build your collection",
                    subtitle = "save your favorites.",
                    animation = { active -> CollectionAnimation(active) }
                )
                5 -> TourPage(
                    isActive = pagerState.currentPage == 5,
                    tagline = "what's that song?",
                    subtitle = "identify any lyric.",
                    animation = { active -> WhatsThatSongAnimation(active) }
                )
            }
        }

        // Skip button — visible on tour pages only
        if (pagerState.currentPage in 1..4) {
            TextButton(
                onClick = onComplete,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = Theme.spacingSm, end = Theme.spacingLg)
            ) {
                Text("Skip", style = Theme.dmSans(14f, FontWeight.Medium), color = Theme.textMuted)
            }
        }

        // Bottom: dot indicators OR continue button
        if (pagerState.currentPage > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = Theme.spacingXxl)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                if (pagerState.currentPage == totalPages - 1) {
                    // Continue button on last page
                    Button(
                        onClick = onComplete,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = Theme.spacingLg)
                            .height(50.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Theme.accent,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Continue", style = Theme.dmSans(16f, FontWeight.Medium))
                    }
                } else {
                    // Dot indicators for pages 1..4
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (i in 1 until totalPages) {
                            val isSelected = i == pagerState.currentPage
                            val size by animateDpAsState(
                                targetValue = if (isSelected) 8.dp else 6.dp,
                                animationSpec = tween(200), label = "dot"
                            )
                            Surface(
                                modifier = Modifier.size(size),
                                shape = CircleShape,
                                color = if (isSelected) Theme.accent else Theme.accent.copy(alpha = 0.25f)
                            ) {}
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────
// Page 0 — Splash
// ──────────────────────────────────────────────────────────────────

@Composable
private fun SplashPage(onGetStarted: () -> Unit) {
    val breathPhase = remember { Animatable(0f) }
    var showWordmark by remember { mutableStateOf(false) }
    var showTagline by remember { mutableStateOf(false) }
    var showButton by remember { mutableStateOf(false) }

    val accentColor = Theme.accent

    // Breathing animation — runs forever
    LaunchedEffect(Unit) {
        breathPhase.animateTo(
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 4000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            )
        )
    }

    // Staggered reveals
    LaunchedEffect(Unit) {
        delay(800)
        showWordmark = true
        delay(400)
        showTagline = true
        delay(400)
        showButton = true
    }

    val wordmarkAlpha by animateFloatAsState(
        targetValue = if (showWordmark) 1f else 0f,
        animationSpec = tween(800), label = "wordmark"
    )
    val wordmarkOffset by animateFloatAsState(
        targetValue = if (showWordmark) 0f else 8f,
        animationSpec = tween(800), label = "wordmarkY"
    )
    val taglineAlpha by animateFloatAsState(
        targetValue = if (showTagline) 1f else 0f,
        animationSpec = tween(800), label = "tagline"
    )
    val taglineOffset by animateFloatAsState(
        targetValue = if (showTagline) 0f else 8f,
        animationSpec = tween(800), label = "taglineY"
    )
    val buttonAlpha by animateFloatAsState(
        targetValue = if (showButton) 1f else 0f,
        animationSpec = tween(800), label = "button"
    )
    val buttonOffset by animateFloatAsState(
        targetValue = if (showButton) 0f else 8f,
        animationSpec = tween(800), label = "buttonY"
    )

    Box(modifier = Modifier.fillMaxSize()) {
        // Breathing waveform canvas
        Canvas(modifier = Modifier.fillMaxSize()) {
            val midY = size.height * 0.45f
            val lineCount = 4
            for (line in 0 until lineCount) {
                val frac = line.toFloat() / (lineCount - 1).toFloat()
                val frequency = 1.5f + frac * 1.2f
                val phaseOffset = frac * Math.PI.toFloat() * 0.6f
                val baseAmplitude = 8f + breathPhase.value * 8f
                val amplitude = baseAmplitude * (0.6f + frac * 0.4f)
                val opacity = 0.15f + frac * 0.1f
                val strokeWidth = 1f + frac * 0.5f
                val yOffset = (frac - 0.5f) * 30f

                val path = Path()
                var x = 0f
                while (x <= size.width) {
                    val normX = x / size.width
                    val y = midY + yOffset +
                        sin((normX * Math.PI * 2.0 * frequency + phaseOffset).toDouble()).toFloat() * amplitude
                    if (x == 0f) path.moveTo(x, y) else path.lineTo(x, y)
                    x += 2f
                }
                drawPath(
                    path = path,
                    color = accentColor.copy(alpha = opacity),
                    style = Stroke(width = strokeWidth)
                )
            }
        }

        // Wordmark + tagline + button
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.weight(1f))

            Text(
                text = "earwyrm",
                fontFamily = CaveatFamily,
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                color = Theme.textPrimary,
                modifier = Modifier
                    .alpha(wordmarkAlpha)
                    .offset { IntOffset(0, wordmarkOffset.dp.roundToPx()) }
            )

            Spacer(modifier = Modifier.height(Theme.spacingMd))

            Text(
                text = "your lyric journal",
                style = Theme.dmSans(15f),
                color = Theme.textSecondary,
                modifier = Modifier
                    .alpha(taglineAlpha)
                    .offset { IntOffset(0, taglineOffset.dp.roundToPx()) }
            )

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = onGetStarted,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = Theme.spacingLg)
                    .height(50.dp)
                    .alpha(buttonAlpha)
                    .offset { IntOffset(0, buttonOffset.dp.roundToPx()) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = Theme.accent,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Get Started", style = Theme.dmSans(16f, FontWeight.Medium))
            }

            Spacer(modifier = Modifier.height(Theme.spacingXxl))
        }
    }
}

// ──────────────────────────────────────────────────────────────────
// TourPage — shared wrapper for pages 1-5
// ──────────────────────────────────────────────────────────────────

@Composable
private fun TourPage(
    isActive: Boolean,
    tagline: String,
    subtitle: String,
    animation: @Composable (Boolean) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = Theme.spacingLg),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.weight(0.15f))

        // Animation area
        Box(
            modifier = Modifier
                .height(240.dp)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            animation(isActive)
        }

        Spacer(modifier = Modifier.height(Theme.spacingXl))

        // Tagline in Caveat
        Text(
            text = tagline,
            fontFamily = CaveatFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = Theme.textPrimary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(Theme.spacingSm))

        // Subtitle in DM Sans
        Text(
            text = subtitle,
            style = Theme.dmSans(15f),
            color = Theme.textSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = Theme.spacingXl)
        )

        Spacer(modifier = Modifier.weight(0.35f))
    }
}

// ──────────────────────────────────────────────────────────────────
// Page 1 — "post a lyric"
// ──────────────────────────────────────────────────────────────────

@Composable
private fun PostLyricAnimation(isActive: Boolean) {
    var showCard by remember { mutableStateOf(false) }
    val showLines = remember { mutableStateListOf(false, false, false) }
    var showDivider by remember { mutableStateOf(false) }
    var showMeta by remember { mutableStateOf(false) }
    var showGlow by remember { mutableStateOf(false) }

    LaunchedEffect(isActive) {
        if (isActive) {
            // Reset
            showCard = false; showLines[0] = false; showLines[1] = false; showLines[2] = false
            showDivider = false; showMeta = false; showGlow = false
            delay(50)
            showCard = true
            delay(300)
            showLines[0] = true
            delay(150)
            showLines[1] = true
            delay(150)
            showLines[2] = true
            delay(150)
            showDivider = true
            delay(100)
            showMeta = true
            delay(100)
            showGlow = true
        } else {
            showCard = false; showLines[0] = false; showLines[1] = false; showLines[2] = false
            showDivider = false; showMeta = false; showGlow = false
        }
    }

    // Card spring
    val cardScale by animateFloatAsState(
        targetValue = if (showCard) 1f else 0.9f,
        animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "cs"
    )
    val cardAlpha by animateFloatAsState(
        targetValue = if (showCard) 1f else 0f, animationSpec = tween(400), label = "ca"
    )
    val cardOffsetY by animateFloatAsState(
        targetValue = if (showCard) 0f else 20f,
        animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "cy"
    )

    val glowAlpha by animateFloatAsState(
        targetValue = if (showGlow) 1f else 0f, animationSpec = tween(600), label = "ga"
    )
    val glowScale by animateFloatAsState(
        targetValue = if (showGlow) 1f else 0.5f,
        animationSpec = spring(dampingRatio = 0.6f), label = "gs"
    )

    Box(contentAlignment = Alignment.Center) {
        // Glow circle
        Box(
            modifier = Modifier
                .offset(x = 90.dp, y = (-70).dp)
                .size(50.dp)
                .alpha(glowAlpha)
                .graphicsLayer { scaleX = glowScale; scaleY = glowScale }
                .clip(CircleShape)
                .background(Theme.accent.copy(alpha = 0.15f))
        )

        // Main card
        Box(
            modifier = Modifier
                .size(width = 240.dp, height = 160.dp)
                .graphicsLayer {
                    scaleX = cardScale; scaleY = cardScale
                    alpha = cardAlpha
                    translationY = cardOffsetY * density
                }
                .shadow(8.dp, RoundedCornerShape(16.dp), spotColor = Color.Black.copy(alpha = 0.06f))
                .clip(RoundedCornerShape(16.dp))
                .background(Theme.card)
        ) {
            Column(modifier = Modifier.padding(Theme.spacingMd)) {
                // Lyric placeholder lines
                val widths = listOf(170.dp, 145.dp, 110.dp)
                for (i in 0..2) {
                    val lineAlpha by animateFloatAsState(
                        targetValue = if (showLines[i]) 1f else 0f, animationSpec = tween(400), label = "l$i"
                    )
                    val lineOffsetX by animateFloatAsState(
                        targetValue = if (showLines[i]) 0f else -8f, animationSpec = tween(400), label = "lx$i"
                    )
                    Box(
                        modifier = Modifier
                            .padding(bottom = 9.dp)
                            .width(widths[i])
                            .height(10.dp)
                            .alpha(lineAlpha)
                            .offset { IntOffset((lineOffsetX * density).toInt(), 0) }
                            .clip(RoundedCornerShape(4.dp))
                            .background(Theme.accent.copy(alpha = 0.35f))
                    )
                }

                Spacer(modifier = Modifier.height(5.dp))

                // Divider
                val divAlpha by animateFloatAsState(
                    targetValue = if (showDivider) 1f else 0f, animationSpec = tween(300), label = "da"
                )
                Box(
                    modifier = Modifier
                        .width(60.dp)
                        .height(1.5.dp)
                        .alpha(divAlpha)
                        .clip(RoundedCornerShape(1.dp))
                        .background(Theme.accent.copy(alpha = 0.5f))
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Song metadata
                val metaAlpha by animateFloatAsState(
                    targetValue = if (showMeta) 1f else 0f, animationSpec = tween(300), label = "ma"
                )
                Box(
                    modifier = Modifier
                        .width(90.dp)
                        .height(6.dp)
                        .alpha(metaAlpha)
                        .clip(RoundedCornerShape(2.dp))
                        .background(Theme.accent.copy(alpha = 0.2f))
                )
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────
// Page 2 — "discover & connect"
// ──────────────────────────────────────────────────────────────────

@Composable
private fun DiscoverConnectAnimation(isActive: Boolean) {
    var fanned by remember { mutableStateOf(false) }

    LaunchedEffect(isActive) {
        if (isActive) {
            fanned = false
            delay(50)
            fanned = true
        } else {
            fanned = false
        }
    }

    val rotations = listOf(-8f, 0f, 8f)
    val xOffsets = listOf(-35f, 0f, 35f)

    Box(contentAlignment = Alignment.Center) {
        for (i in 0..2) {
            val rot by animateFloatAsState(
                targetValue = if (fanned) rotations[i] else 0f,
                animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "r$i"
            )
            val offX by animateFloatAsState(
                targetValue = if (fanned) xOffsets[i] else 0f,
                animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "ox$i"
            )
            val offY by animateFloatAsState(
                targetValue = if (fanned) 0f else i * -4f,
                animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "oy$i"
            )

            Box(
                modifier = Modifier
                    .graphicsLayer {
                        rotationZ = rot
                        translationX = offX * density
                        translationY = offY * density
                    }
                    .size(width = 160.dp, height = 120.dp)
                    .shadow(8.dp, RoundedCornerShape(14.dp), spotColor = Color.Black.copy(alpha = 0.06f))
                    .clip(RoundedCornerShape(14.dp))
                    .background(Theme.card)
            ) {
                // Card content placeholders
                Column(modifier = Modifier.padding(12.dp)) {
                    val lineWidths = if (i == 2) listOf(110.dp, 90.dp) else listOf(100.dp, 80.dp)
                    val lineOpacity = if (i == 2) 0.35f else if (i == 1) 0.25f else 0.2f
                    for (w in lineWidths) {
                        Box(
                            modifier = Modifier
                                .padding(bottom = 7.dp)
                                .width(w)
                                .height(8.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(Theme.accent.copy(alpha = lineOpacity))
                        )
                    }
                    if (i == 2) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Box(
                            modifier = Modifier
                                .width(40.dp)
                                .height(1.5.dp)
                                .clip(RoundedCornerShape(1.dp))
                                .background(Theme.accent.copy(alpha = 0.5f))
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Box(
                            modifier = Modifier
                                .width(60.dp)
                                .height(5.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(Theme.accent.copy(alpha = 0.2f))
                        )
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────
// Page 3 — "memory lane"
// ──────────────────────────────────────────────────────────────────

@Composable
private fun MemoryLaneAnimation(isActive: Boolean) {
    var showMainCard by remember { mutableStateOf(false) }
    var showBehindCard by remember { mutableStateOf(false) }
    val showLines = remember { mutableStateListOf(false, false) }
    var showBadge by remember { mutableStateOf(false) }
    var showGlow by remember { mutableStateOf(false) }

    LaunchedEffect(isActive) {
        if (isActive) {
            showMainCard = false; showBehindCard = false
            showLines[0] = false; showLines[1] = false
            showBadge = false; showGlow = false
            delay(50)
            showMainCard = true
            showLines[0] = true
            delay(120)
            showLines[1] = true
            showBehindCard = true
            delay(200)
            showBadge = true
            showGlow = true
        } else {
            showMainCard = false; showBehindCard = false
            showLines[0] = false; showLines[1] = false
            showBadge = false; showGlow = false
        }
    }

    val mainOffsetX by animateFloatAsState(
        targetValue = if (showMainCard) 0f else -40f,
        animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "mx"
    )
    val mainAlpha by animateFloatAsState(
        targetValue = if (showMainCard) 1f else 0f, animationSpec = tween(400), label = "mal"
    )

    val behindOffsetX by animateFloatAsState(
        targetValue = if (showBehindCard) -18f else -50f,
        animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "bx"
    )
    val behindAlpha by animateFloatAsState(
        targetValue = if (showBehindCard) 0.7f else 0f, animationSpec = tween(500), label = "bal"
    )

    val glowAlpha by animateFloatAsState(
        targetValue = if (showGlow) 1f else 0f, animationSpec = tween(800), label = "ga"
    )
    val glowScale by animateFloatAsState(
        targetValue = if (showGlow) 1f else 0.4f,
        animationSpec = spring(dampingRatio = 0.6f), label = "gs"
    )

    val badgeAlpha by animateFloatAsState(
        targetValue = if (showBadge) 1f else 0f, animationSpec = tween(350), label = "bda"
    )
    val badgeScale by animateFloatAsState(
        targetValue = if (showBadge) 1f else 0.7f,
        animationSpec = spring(dampingRatio = 0.6f), label = "bds"
    )

    Box(contentAlignment = Alignment.Center) {
        // Warm glow
        Box(
            modifier = Modifier
                .offset(x = 100.dp, y = 10.dp)
                .size(70.dp)
                .alpha(glowAlpha)
                .graphicsLayer { scaleX = glowScale; scaleY = glowScale }
                .clip(CircleShape)
                .background(Theme.accent.copy(alpha = 0.12f))
        )

        // Behind card
        Box(
            modifier = Modifier
                .graphicsLayer {
                    translationX = behindOffsetX * density
                    translationY = 6f * density
                    alpha = behindAlpha
                }
                .size(width = 200.dp, height = 130.dp)
                .shadow(6.dp, RoundedCornerShape(16.dp), spotColor = Color.Black.copy(alpha = 0.04f))
                .clip(RoundedCornerShape(16.dp))
                .background(Theme.card)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Box(
                    modifier = Modifier
                        .width(120.dp).height(8.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(Theme.accent.copy(alpha = 0.15f))
                )
                Spacer(modifier = Modifier.height(7.dp))
                Box(
                    modifier = Modifier
                        .width(90.dp).height(8.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(Theme.accent.copy(alpha = 0.12f))
                )
            }
        }

        // Main memory card
        Box(
            modifier = Modifier
                .graphicsLayer {
                    translationX = mainOffsetX * density
                    alpha = mainAlpha
                }
                .size(width = 200.dp, height = 130.dp)
                .shadow(8.dp, RoundedCornerShape(16.dp), spotColor = Color.Black.copy(alpha = 0.06f))
                .clip(RoundedCornerShape(16.dp))
                .background(Theme.card)
        ) {
            // Subtle accent tint overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Theme.accent.copy(alpha = 0.05f))
            )

            Column(modifier = Modifier.padding(14.dp)) {
                // Duration badge — top right
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.TopEnd) {
                    Text(
                        text = "3mo ago",
                        style = Theme.dmSans(11f, FontWeight.Medium),
                        color = Theme.accent,
                        modifier = Modifier
                            .alpha(badgeAlpha)
                            .graphicsLayer { scaleX = badgeScale; scaleY = badgeScale }
                            .clip(RoundedCornerShape(50))
                            .background(Theme.accent.copy(alpha = 0.12f))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Lyric placeholders
                val lineWidths = listOf(140.dp, 110.dp)
                for (i in 0..1) {
                    val lAlpha by animateFloatAsState(
                        targetValue = if (showLines[i]) 1f else 0f, animationSpec = tween(400), label = "ml$i"
                    )
                    val lOffX by animateFloatAsState(
                        targetValue = if (showLines[i]) 0f else -6f, animationSpec = tween(400), label = "mlx$i"
                    )
                    Box(
                        modifier = Modifier
                            .padding(bottom = 8.dp)
                            .width(lineWidths[i])
                            .height(9.dp)
                            .alpha(lAlpha)
                            .offset { IntOffset((lOffX * density).toInt(), 0) }
                            .clip(RoundedCornerShape(3.dp))
                            .background(Theme.accent.copy(alpha = 0.35f))
                    )
                }

                Spacer(modifier = Modifier.weight(1f))

                // Song metadata
                Box(
                    modifier = Modifier
                        .width(80.dp).height(5.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(Theme.accent.copy(alpha = 0.2f))
                )
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────
// Page 4 — "build your collection"
// ──────────────────────────────────────────────────────────────────

@Composable
private fun CollectionAnimation(isActive: Boolean) {
    var arranged by remember { mutableStateOf(false) }
    var showBookmark by remember { mutableStateOf(false) }

    LaunchedEffect(isActive) {
        if (isActive) {
            arranged = false; showBookmark = false
            delay(100)
            arranged = true
            showBookmark = true
        } else {
            arranged = false; showBookmark = false
        }
    }

    val accentTones = listOf(1f, 0.7f, 0.5f, 0.85f)
    val scattered = listOf(
        Pair(-60f, -40f), Pair(70f, -30f), Pair(-50f, 50f), Pair(60f, 60f)
    )
    val grid = listOf(
        Pair(-35f, -35f), Pair(35f, -35f), Pair(-35f, 35f), Pair(35f, 35f)
    )

    val bookmarkAlpha by animateFloatAsState(
        targetValue = if (showBookmark) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = Spring.StiffnessMediumLow), label = "bka"
    )
    val bookmarkScale by animateFloatAsState(
        targetValue = if (showBookmark) 1f else 0.3f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = Spring.StiffnessMediumLow), label = "bks"
    )

    Box(contentAlignment = Alignment.Center) {
        // Bookmark icon
        Icon(
            imageVector = Icons.Filled.Bookmark,
            contentDescription = null,
            tint = Theme.accent,
            modifier = Modifier
                .offset(y = (-90).dp)
                .size(24.dp)
                .alpha(bookmarkAlpha)
                .graphicsLayer { scaleX = bookmarkScale; scaleY = bookmarkScale }
        )

        for (i in 0..3) {
            val from = scattered[i]
            val to = grid[i]
            val offX by animateFloatAsState(
                targetValue = if (arranged) to.first else from.first,
                animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "cx$i"
            )
            val offY by animateFloatAsState(
                targetValue = if (arranged) to.second else from.second,
                animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "cy$i"
            )

            Box(
                modifier = Modifier
                    .graphicsLayer {
                        translationX = offX * density
                        translationY = offY * density
                    }
                    .size(60.dp)
                    .shadow(6.dp, RoundedCornerShape(10.dp), spotColor = Color.Black.copy(alpha = 0.06f))
                    .clip(RoundedCornerShape(10.dp))
                    .background(Theme.card)
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Colored accent bar at top
                    Spacer(modifier = Modifier.height(6.dp))
                    Box(
                        modifier = Modifier
                            .width(52.dp)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Theme.accent.copy(alpha = accentTones[i]))
                    )

                    Spacer(modifier = Modifier.weight(1f))

                    // Tiny placeholders
                    Box(
                        modifier = Modifier
                            .width(36.dp).height(5.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Theme.accent.copy(alpha = 0.3f))
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .width(28.dp).height(5.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Theme.accent.copy(alpha = 0.2f))
                    )

                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────
// Page 5 — "what's that song?"
// ──────────────────────────────────────────────────────────────────

@Composable
private fun WhatsThatSongAnimation(isActive: Boolean) {
    var showInput by remember { mutableStateOf(false) }
    var typedText by remember { mutableStateOf("") }
    var showResult by remember { mutableStateOf(false) }

    val fullText = "I got sunshine"

    LaunchedEffect(isActive) {
        if (isActive) {
            showInput = false; typedText = ""; showResult = false
            delay(100)
            showInput = true
            // Typewriter
            delay(300)
            for (ch in fullText) {
                typedText += ch
                delay(80)
            }
            delay(400)
            showResult = true
        } else {
            showInput = false; typedText = ""; showResult = false
        }
    }

    val inputAlpha by animateFloatAsState(
        targetValue = if (showInput) 1f else 0f, animationSpec = tween(300), label = "ia"
    )
    val inputScale by animateFloatAsState(
        targetValue = if (showInput) 1f else 0.95f,
        animationSpec = spring(dampingRatio = 0.7f), label = "is"
    )

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        // Input area
        Box(
            modifier = Modifier
                .size(width = 220.dp, height = 100.dp)
                .alpha(inputAlpha)
                .graphicsLayer { scaleX = inputScale; scaleY = inputScale }
                .clip(RoundedCornerShape(14.dp))
                .background(Color.Transparent)
        ) {
            // Border
            Canvas(modifier = Modifier.fillMaxSize()) {
                drawRoundRect(
                    color = Color(0xFFE8E4DF),
                    style = Stroke(width = 1.5f * density),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(14f * density)
                )
            }
            Text(
                text = typedText,
                fontFamily = CaveatFamily,
                fontSize = 20.sp,
                color = Theme.textPrimary,
                modifier = Modifier.padding(horizontal = 15.dp, vertical = 10.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Match result
        AnimatedVisibility(
            visible = showResult,
            enter = fadeIn(tween(300)) + slideInVertically(
                animationSpec = spring(dampingRatio = 0.6f, stiffness = Spring.StiffnessMediumLow),
                initialOffsetY = { it / 2 }
            ) + scaleIn(initialScale = 0.9f, animationSpec = tween(300))
        ) {
            Box(
                modifier = Modifier
                    .size(width = 220.dp, height = 56.dp)
                    .shadow(8.dp, RoundedCornerShape(12.dp), spotColor = Color.Black.copy(alpha = 0.06f))
                    .clip(RoundedCornerShape(12.dp))
                    .background(Theme.card)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.MusicNote,
                        contentDescription = null,
                        tint = Theme.accent,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "My Girl",
                            style = Theme.dmSans(13f, FontWeight.Medium),
                            color = Theme.textPrimary
                        )
                        Text(
                            text = "The Temptations",
                            style = Theme.dmSans(11f),
                            color = Theme.textMuted
                        )
                    }
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = Theme.accent,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
