package com.earwyrm.app.feature.explore

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    navController: NavHostController,
    viewModel: ExploreViewModel = hiltViewModel()
) {
    val selectedTab by viewModel.selectedTab.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val isSearchActive by viewModel.isSearchActive.collectAsState()
    val haptics = rememberHaptics()

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
                    "Search lyrics, songs, artists, users...",
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
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { viewModel.setSearchQuery("") }) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Clear search",
                            tint = Theme.textMuted
                        )
                    }
                }
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

        Spacer(modifier = Modifier.height(8.dp))

        // When searching, show search results instead of tabs + feed
        AnimatedVisibility(
            visible = isSearchActive,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            ExploreSearchResults(
                viewModel = viewModel,
                navController = navController
            )
        }

        AnimatedVisibility(
            visible = !isSearchActive,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
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
                    onRefresh = { haptics.light(); viewModel.loadData() },
                    modifier = Modifier.fillMaxSize()
                ) {
                    when (selectedTab) {
                        0 -> ForYouTab(viewModel = viewModel, navController = navController)
                        1 -> FollowingTab(viewModel = viewModel, navController = navController)
                    }
                }
            }
        }
    }
}
