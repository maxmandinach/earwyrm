package com.earwyrm.app.feature.onboarding

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import kotlinx.coroutines.launch

data class OnboardingPage(
    val title: String,
    val subtitle: String,
    val description: String
)

val onboardingPages = listOf(
    OnboardingPage(
        title = "earwyrm",
        subtitle = "what's stuck in your head?",
        description = "Share the lyrics that won't leave your mind. One earwyrm at a time."
    ),
    OnboardingPage(
        title = "discover",
        subtitle = "explore what others are hearing",
        description = "See what lyrics are stuck in other people's heads. Follow artists, songs, and friends."
    ),
    OnboardingPage(
        title = "collect",
        subtitle = "build your lyric library",
        description = "Save earwyrms to collections. Create smart collections that auto-fill by tag."
    ),
    OnboardingPage(
        title = "reflect",
        subtitle = "your musical memory lane",
        description = "Look back at your history of earwyrms. Add notes about why each lyric stuck."
    )
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingFlow(
    onComplete: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { onboardingPages.size })
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Skip button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.End
        ) {
            TextButton(onClick = onComplete) {
                Text("Skip", style = Theme.dmSans(14f), color = Theme.textMuted)
            }
        }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
        ) { page ->
            val p = onboardingPages[page]
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = p.title,
                    fontFamily = CaveatFamily,
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold,
                    color = Theme.accent,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = p.subtitle,
                    style = Theme.dmSans(18f, FontWeight.SemiBold),
                    color = Theme.textPrimary,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = p.description,
                    style = Theme.dmSans(15f),
                    color = Theme.textSecondary,
                    textAlign = TextAlign.Center,
                    lineHeight = 22.sp
                )
            }
        }

        // Page indicators
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(16.dp)
        ) {
            repeat(onboardingPages.size) { index ->
                Surface(
                    modifier = Modifier.size(8.dp),
                    shape = CircleShape,
                    color = if (index == pagerState.currentPage) Theme.accent
                    else Theme.accent.copy(alpha = 0.3f)
                ) { }
            }
        }

        // Next / Get Started button
        Button(
            onClick = {
                if (pagerState.currentPage == onboardingPages.size - 1) {
                    onComplete()
                } else {
                    scope.launch {
                        pagerState.animateScrollToPage(pagerState.currentPage + 1)
                    }
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp, vertical = 16.dp)
                .height(50.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Theme.accent,
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(
                text = if (pagerState.currentPage == onboardingPages.size - 1) "Get Started" else "Next",
                style = Theme.dmSans(16f, FontWeight.SemiBold)
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}
