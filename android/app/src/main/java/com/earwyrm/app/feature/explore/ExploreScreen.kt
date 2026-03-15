package com.earwyrm.app.feature.explore

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    navController: NavHostController,
    viewModel: ExploreViewModel = hiltViewModel()
) {
    val selectedTab by viewModel.selectedTab.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val trendingTags by viewModel.trendingTags.collectAsState()
    val selectedTag by viewModel.selectedTag.collectAsState()
    val sortOption by viewModel.sortOption.collectAsState()
    val timeRange by viewModel.timeRange.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        Text(
            text = "explore",
            fontFamily = CaveatFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = Theme.accent,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )

        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { viewModel.setSearchQuery(it) },
            placeholder = {
                Text(
                    "Search lyrics, songs, artists...",
                    style = Theme.dmSans(14f),
                    color = Theme.textMuted
                )
            },
            leadingIcon = {
                Icon(
                    Icons.Default.Search,
                    contentDescription = "Search",
                    tint = Theme.accent
                )
            },
            singleLine = true,
            textStyle = Theme.dmSans(14f).copy(color = Theme.textPrimary),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Theme.accent,
                unfocusedBorderColor = Theme.divider,
                cursorColor = Theme.accent,
                focusedContainerColor = Theme.card,
                unfocusedContainerColor = Theme.card
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        )

        // Trending tags
        if (trendingTags.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                trendingTags.forEach { tag ->
                    FilterChip(
                        selected = selectedTag == tag,
                        onClick = { viewModel.setSelectedTag(tag) },
                        label = {
                            Text(
                                "#$tag",
                                style = Theme.dmSans(12f),
                                color = if (selectedTag == tag) Theme.card else Theme.accent
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            containerColor = Theme.card,
                            selectedContainerColor = Theme.accent
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            borderColor = Theme.divider,
                            selectedBorderColor = Theme.accent,
                            enabled = true,
                            selected = selectedTag == tag
                        )
                    )
                }
            }
        }

        // Sort & time range dropdowns
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SortDropdown(
                selectedOption = sortOption,
                onOptionSelected = { viewModel.setSortOption(it) },
                modifier = Modifier.weight(1f)
            )
            TimeRangeDropdown(
                selectedRange = timeRange,
                onRangeSelected = { viewModel.setTimeRange(it) },
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Theme.background,
            contentColor = Theme.accent,
            indicator = { tabPositions ->
                if (selectedTab < tabPositions.size) {
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = Theme.accent
                    )
                }
            }
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { viewModel.selectTab(0) },
                text = {
                    Text(
                        "For You",
                        style = Theme.dmSans(14f, if (selectedTab == 0) FontWeight.SemiBold else FontWeight.Normal),
                        color = if (selectedTab == 0) Theme.accent else Theme.textMuted
                    )
                }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { viewModel.selectTab(1) },
                text = {
                    Text(
                        "Following",
                        style = Theme.dmSans(14f, if (selectedTab == 1) FontWeight.SemiBold else FontWeight.Normal),
                        color = if (selectedTab == 1) Theme.accent else Theme.textMuted
                    )
                }
            )
        }

        PullToRefreshBox(
            isRefreshing = isLoading,
            onRefresh = { viewModel.loadData() },
            modifier = Modifier.fillMaxSize()
        ) {
            when (selectedTab) {
                0 -> ForYouTab(viewModel = viewModel, navController = navController)
                1 -> FollowingTab(viewModel = viewModel, navController = navController)
            }
        }
    }
}

@Composable
private fun SortDropdown(
    selectedOption: Int,
    onOptionSelected: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val labels = listOf("Newest", "Most Resonated", "Most Discussed")
    var expanded by remember { mutableStateOf(false) }

    Column(modifier = modifier) {
        OutlinedButton(
            onClick = { expanded = true },
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                labels[selectedOption],
                style = Theme.dmSans(12f),
                color = Theme.textPrimary,
                maxLines = 1
            )
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            labels.forEachIndexed { index, label ->
                DropdownMenuItem(
                    text = {
                        Text(
                            label,
                            style = Theme.dmSans(13f, if (index == selectedOption) FontWeight.SemiBold else FontWeight.Normal),
                            color = if (index == selectedOption) Theme.accent else Theme.textPrimary
                        )
                    },
                    onClick = {
                        onOptionSelected(index)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
private fun TimeRangeDropdown(
    selectedRange: Int,
    onRangeSelected: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val labels = listOf("All Time", "This Week", "Today")
    var expanded by remember { mutableStateOf(false) }

    Column(modifier = modifier) {
        OutlinedButton(
            onClick = { expanded = true },
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                labels[selectedRange],
                style = Theme.dmSans(12f),
                color = Theme.textPrimary,
                maxLines = 1
            )
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            labels.forEachIndexed { index, label ->
                DropdownMenuItem(
                    text = {
                        Text(
                            label,
                            style = Theme.dmSans(13f, if (index == selectedRange) FontWeight.SemiBold else FontWeight.Normal),
                            color = if (index == selectedRange) Theme.accent else Theme.textPrimary
                        )
                    },
                    onClick = {
                        onRangeSelected(index)
                        expanded = false
                    }
                )
            }
        }
    }
}
