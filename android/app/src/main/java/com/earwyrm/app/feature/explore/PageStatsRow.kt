package com.earwyrm.app.feature.explore

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme

/**
 * A horizontally scrollable row of stat cards.
 * Each pair is (label, formattedValue), e.g. ("saves", "1.2k").
 */
@Composable
fun PageStatsRow(
    stats: List<Pair<String, String>>,
    modifier: Modifier = Modifier
) {
    if (stats.isEmpty()) return

    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(stats) { (label, value) ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Theme.card),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = value,
                        style = Theme.dmSans(18f, FontWeight.Bold),
                        color = Theme.accent
                    )
                    Text(
                        text = label,
                        style = Theme.dmSans(11f),
                        color = Theme.textMuted
                    )
                }
            }
        }
    }
}

/** Format an integer compactly: 1200 -> "1.2k", 1500000 -> "1.5M" */
fun formatStatValue(value: Int): String {
    return when {
        value >= 1_000_000 -> String.format("%.1fM", value / 1_000_000.0)
        value >= 1_000 -> String.format("%.1fk", value / 1_000.0)
        else -> value.toString()
    }
}
