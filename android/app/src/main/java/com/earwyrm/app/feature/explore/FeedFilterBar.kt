package com.earwyrm.app.feature.explore

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme

@Composable
fun FeedFilterBar(
    selectedSort: SortOption,
    onSortSelected: (SortOption) -> Unit,
    selectedTimeRange: TimeRange,
    onTimeRangeSelected: (TimeRange) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        // Sort options row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            SortOption.entries.forEach { option ->
                val selected = selectedSort == option
                FilterChip(
                    selected = selected,
                    onClick = { onSortSelected(option) },
                    label = {
                        Text(
                            option.label,
                            style = Theme.dmSans(12f),
                            color = if (selected) Theme.card else Theme.textPrimary
                        )
                    },
                    shape = RoundedCornerShape(20.dp),
                    colors = FilterChipDefaults.filterChipColors(
                        containerColor = Theme.card,
                        selectedContainerColor = Theme.accent
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        borderColor = Theme.divider,
                        selectedBorderColor = Theme.accent,
                        enabled = true,
                        selected = selected
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Time range row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            TimeRange.entries.forEach { range ->
                val selected = selectedTimeRange == range
                FilterChip(
                    selected = selected,
                    onClick = { onTimeRangeSelected(range) },
                    label = {
                        Text(
                            range.label,
                            style = Theme.dmSans(12f),
                            color = if (selected) Theme.card else Theme.textPrimary
                        )
                    },
                    shape = RoundedCornerShape(20.dp),
                    colors = FilterChipDefaults.filterChipColors(
                        containerColor = Theme.card,
                        selectedContainerColor = Theme.accent
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        borderColor = Theme.divider,
                        selectedBorderColor = Theme.accent,
                        enabled = true,
                        selected = selected
                    )
                )
            }
        }
    }
}
