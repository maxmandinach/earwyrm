package com.earwyrm.app.feature.explore

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics

@Composable
fun FollowButton(
    isFollowing: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val haptics = rememberHaptics()

    val backgroundColor by animateColorAsState(
        targetValue = if (isFollowing) Theme.card else Theme.accent,
        animationSpec = tween(200),
        label = "follow_btn_bg"
    )
    val textColor by animateColorAsState(
        targetValue = if (isFollowing) Theme.textPrimary else Color.White,
        animationSpec = tween(200),
        label = "follow_btn_text"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isFollowing) Theme.divider else Color.Transparent,
        animationSpec = tween(200),
        label = "follow_btn_border"
    )

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(backgroundColor)
            .border(1.dp, borderColor, RoundedCornerShape(20.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                haptics.light()
                onClick()
            }
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = if (isFollowing) "following" else "follow",
            style = Theme.dmSans(13f, FontWeight.Medium),
            color = textColor
        )
    }
}
