package com.earwyrm.app.feature.subscription

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.History
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme

@Composable
fun MemoryLaneUpsellCard(
    onUpgrade: () -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedCard(
        onClick = onUpgrade,
        modifier = modifier
            .width(240.dp)
            .height(150.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.outlinedCardColors(containerColor = Theme.background),
        border = BorderStroke(1.5.dp, Theme.accent.copy(alpha = 0.4f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Outlined.History,
                contentDescription = null,
                tint = Theme.accent,
                modifier = Modifier.size(24.dp)
            )

            Spacer(Modifier.height(8.dp))

            Text(
                text = "see all",
                style = Theme.caveat(22f),
                color = Theme.accent
            )

            Spacer(Modifier.height(4.dp))

            Text(
                text = "unlock your full\nmemory lane",
                style = Theme.dmSans(12f),
                color = Theme.textMuted,
                textAlign = TextAlign.Center
            )
        }
    }
}
