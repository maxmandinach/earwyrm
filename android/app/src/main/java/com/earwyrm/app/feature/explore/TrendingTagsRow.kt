package com.earwyrm.app.feature.explore

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme

@Composable
fun TrendingTagsRow(
    tags: List<Pair<String, Int>>,
    selectedTag: String?,
    onTagSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (tags.isEmpty()) return

    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        items(tags, key = { it.first }) { (tag, count) ->
            val selected = selectedTag == tag
            FilterChip(
                selected = selected,
                onClick = { onTagSelected(tag) },
                label = {
                    Text(
                        text = "#$tag  $count",
                        style = Theme.dmSans(
                            12f,
                            if (selected) FontWeight.SemiBold else FontWeight.Normal
                        ),
                        color = if (selected) Theme.card else Theme.accent
                    )
                },
                shape = RoundedCornerShape(20.dp),
                colors = FilterChipDefaults.filterChipColors(
                    containerColor = Theme.card,
                    selectedContainerColor = Theme.accent
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = Theme.accent.copy(alpha = 0.3f),
                    selectedBorderColor = Theme.accent,
                    enabled = true,
                    selected = selected
                )
            )
        }
    }
}
