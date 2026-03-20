package com.earwyrm.app.feature.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics

data class FollowFilterItem(
    val id: String,
    val type: String, // "artist", "song", "tag", "user"
    val displayName: String
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FollowFilterSheet(
    viewModel: ExploreViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val follows by viewModel.followManagerFollows.collectAsState()
    val userFollows by viewModel.followManagerUserFollows.collectAsState()
    val activeFilterIds by viewModel.activeFollowFilterIds.collectAsState()
    val followedUserProfiles by viewModel.followedUserProfiles.collectAsState()
    val haptics = rememberHaptics()
    var search by remember { mutableStateOf("") }

    // Build filter items from follows + user follows
    val allItems = remember(follows, userFollows, followedUserProfiles) {
        val items = mutableListOf<FollowFilterItem>()
        follows.forEach { f ->
            items.add(FollowFilterItem(
                id = f.id,
                type = f.filterType,
                displayName = if (f.filterType == "tag") "#${f.filterValue}" else f.filterValue
            ))
        }
        userFollows.forEach { uf ->
            val username = followedUserProfiles[uf.followingId]?.username ?: uf.followingId
            items.add(FollowFilterItem(
                id = uf.id,
                type = "user",
                displayName = "@$username"
            ))
        }
        items
    }

    val filteredItems = remember(allItems, search) {
        if (search.isBlank()) allItems
        else allItems.filter { it.displayName.contains(search, ignoreCase = true) }
    }

    val artists = filteredItems.filter { it.type == "artist" }
    val songs = filteredItems.filter { it.type == "song" }
    val tags = filteredItems.filter { it.type == "tag" }
    val users = filteredItems.filter { it.type == "user" }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Theme.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "filter follows",
                    style = Theme.dmSans(18f, FontWeight.SemiBold),
                    color = Theme.textPrimary
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "clear all",
                        style = Theme.dmSans(14f),
                        color = Theme.accent,
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            haptics.light()
                            viewModel.clearFollowFilters()
                        }
                    )
                    Text(
                        text = "select all",
                        style = Theme.dmSans(14f),
                        color = Theme.accent,
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            haptics.light()
                            viewModel.selectAllFollowFilters(allItems.map { it.id }.toSet())
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Search field
            BasicTextField(
                value = search,
                onValueChange = { search = it },
                textStyle = Theme.dmSans(14f).copy(color = Theme.textPrimary),
                cursorBrush = SolidColor(Theme.accent),
                singleLine = true,
                decorationBox = { innerTextField ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Theme.background)
                            .padding(horizontal = 12.dp, vertical = 10.dp)
                    ) {
                        if (search.isEmpty()) {
                            Text(
                                text = "search follows...",
                                style = Theme.dmSans(14f),
                                color = Theme.textMuted
                            )
                        }
                        innerTextField()
                    }
                }
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Scrollable list of sections
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f, fill = false),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                if (artists.isNotEmpty()) {
                    item { SectionHeader("Artists", artists, activeFilterIds, viewModel, haptics) }
                    items(artists, key = { it.id }) { item ->
                        FilterRow(item, item.id in activeFilterIds, haptics) {
                            viewModel.toggleFollowFilter(item.id)
                        }
                    }
                }
                if (songs.isNotEmpty()) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }
                    item { SectionHeader("Songs", songs, activeFilterIds, viewModel, haptics) }
                    items(songs, key = { it.id }) { item ->
                        FilterRow(item, item.id in activeFilterIds, haptics) {
                            viewModel.toggleFollowFilter(item.id)
                        }
                    }
                }
                if (tags.isNotEmpty()) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }
                    item { SectionHeader("Tags", tags, activeFilterIds, viewModel, haptics) }
                    items(tags, key = { it.id }) { item ->
                        FilterRow(item, item.id in activeFilterIds, haptics) {
                            viewModel.toggleFollowFilter(item.id)
                        }
                    }
                }
                if (users.isNotEmpty()) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }
                    item { SectionHeader("Users", users, activeFilterIds, viewModel, haptics) }
                    items(users, key = { it.id }) { item ->
                        FilterRow(item, item.id in activeFilterIds, haptics) {
                            viewModel.toggleFollowFilter(item.id)
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
            }

            // Done button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Theme.accent)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) {
                        haptics.light()
                        onDismiss()
                    }
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "done",
                    style = Theme.dmSans(15f, FontWeight.Medium),
                    color = androidx.compose.ui.graphics.Color.White
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    items: List<FollowFilterItem>,
    activeIds: Set<String>,
    viewModel: ExploreViewModel,
    haptics: com.earwyrm.app.core.design.Haptics
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = title,
            style = Theme.dmSans(12f, FontWeight.SemiBold),
            color = Theme.textSecondary
        )
        Text(
            text = "select all",
            style = Theme.dmSans(11f),
            color = Theme.accent,
            modifier = Modifier.clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                haptics.light()
                viewModel.selectAllFollowFilters(items.map { it.id }.toSet())
            }
        )
    }
}

@Composable
private fun FilterRow(
    item: FollowFilterItem,
    isActive: Boolean,
    haptics: com.earwyrm.app.core.design.Haptics,
    onToggle: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                haptics.light()
                onToggle()
            }
            .padding(horizontal = 4.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = item.displayName,
            style = Theme.dmSans(14f),
            color = Theme.textPrimary,
            modifier = Modifier.weight(1f)
        )
        Icon(
            imageVector = if (isActive) Icons.Filled.CheckCircle else Icons.Outlined.Circle,
            contentDescription = if (isActive) "Selected" else "Not selected",
            tint = if (isActive) Theme.accent else Theme.textMuted,
            modifier = Modifier.size(22.dp)
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ActiveFilterChips(
    viewModel: ExploreViewModel
) {
    val activeFilterIds by viewModel.activeFollowFilterIds.collectAsState()
    val follows by viewModel.followManagerFollows.collectAsState()
    val userFollows by viewModel.followManagerUserFollows.collectAsState()
    val followedUserProfiles by viewModel.followedUserProfiles.collectAsState()
    val haptics = rememberHaptics()

    if (activeFilterIds.isEmpty()) return

    // Build display names for active filters
    val activeItems = remember(activeFilterIds, follows, userFollows, followedUserProfiles) {
        val items = mutableListOf<FollowFilterItem>()
        follows.filter { it.id in activeFilterIds }.forEach { f ->
            items.add(FollowFilterItem(
                id = f.id,
                type = f.filterType,
                displayName = if (f.filterType == "tag") "#${f.filterValue}" else f.filterValue
            ))
        }
        userFollows.filter { it.id in activeFilterIds }.forEach { uf ->
            val username = followedUserProfiles[uf.followingId]?.username ?: uf.followingId
            items.add(FollowFilterItem(id = uf.id, type = "user", displayName = "@$username"))
        }
        items
    }

    if (activeItems.isEmpty()) return

    FlowRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        activeItems.forEach { item ->
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Theme.accent.copy(alpha = 0.15f))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) {
                        haptics.light()
                        viewModel.toggleFollowFilter(item.id)
                    }
                    .padding(start = 10.dp, end = 6.dp, top = 5.dp, bottom = 5.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = item.displayName,
                    style = Theme.dmSans(12f),
                    color = Theme.accent
                )
                Spacer(modifier = Modifier.width(2.dp))
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Remove filter",
                    tint = Theme.accent,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}
