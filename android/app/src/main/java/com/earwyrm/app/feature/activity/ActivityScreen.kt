package com.earwyrm.app.feature.activity

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavHostController
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.AppNotification
import com.earwyrm.app.core.supabase.NotificationManager
import com.earwyrm.app.core.util.formatRelativeTime
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ActivityViewModel @Inject constructor(
    private val notificationManager: NotificationManager,
    private val authManager: AuthManager
) : ViewModel() {
    val notifications = notificationManager.notifications
    val unreadCount = notificationManager.unreadCount

    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            val userId = authManager.userId ?: return@launch
            notificationManager.setLastSeenAt(authManager.profile.value?.lastActivitySeenAt)
            notificationManager.fetchNotifications(userId)
            _isLoading.value = false
        }
    }

    fun markSeen() {
        viewModelScope.launch {
            val userId = authManager.userId ?: return@launch
            notificationManager.markAllSeen(userId)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityScreen(
    navController: NavHostController,
    viewModel: ActivityViewModel = hiltViewModel()
) {
    val notifications by viewModel.notifications.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var selectedFilter by remember { mutableStateOf("All") }
    val filters = listOf("All", "Resonances", "Comments", "Follows")

    val filteredNotifications = remember(notifications, selectedFilter) {
        when (selectedFilter) {
            "Resonances" -> notifications.filter { it.type == "reaction" }
            "Comments" -> notifications.filter { it.type == "comment" || it.type == "reply" }
            "Follows" -> notifications.filter { it.type == "follow" }
            else -> notifications
        }
    }

    LaunchedEffect(Unit) {
        viewModel.markSeen()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        Text(
            text = "activity",
            fontFamily = CaveatFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = Theme.accent,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            filters.forEach { filter ->
                val isSelected = selectedFilter == filter
                FilterChip(
                    selected = isSelected,
                    onClick = { selectedFilter = filter },
                    label = {
                        Text(
                            text = filter,
                            style = Theme.dmSans(13f, if (isSelected) FontWeight.SemiBold else FontWeight.Normal)
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Theme.accent,
                        selectedLabelColor = Theme.background,
                        containerColor = Theme.card,
                        labelColor = Theme.textSecondary
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        borderColor = Theme.accent.copy(alpha = 0.3f),
                        selectedBorderColor = Theme.accent,
                        enabled = true,
                        selected = isSelected
                    ),
                    shape = RoundedCornerShape(20.dp)
                )
            }
        }

        PullToRefreshBox(
            isRefreshing = isLoading,
            onRefresh = { viewModel.load() },
            modifier = Modifier.fillMaxSize()
        ) {
            if (filteredNotifications.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = if (selectedFilter == "All") "No activity yet" else "No $selectedFilter yet",
                        style = Theme.dmSans(16f),
                        color = Theme.textSecondary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredNotifications, key = { it.id }) { notification ->
                        NotificationCard(
                            notification = notification,
                            navController = navController
                        )
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }
}

@Composable
private fun NotificationCard(
    notification: AppNotification,
    navController: NavHostController
) {
    val description = buildNotificationText(notification)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable {
                when (notification.type) {
                    "comment" -> { }
                    "share" -> {
                        notification.shareToken?.let { }
                    }
                    else -> { }
                }
            },
        colors = CardDefaults.cardColors(
            containerColor = if (notification.readAt == null) {
                Theme.accent.copy(alpha = 0.05f)
            } else Theme.card
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row {
                if (notification.actorUsername != null) {
                    Text(
                        text = "@${notification.actorUsername}",
                        style = Theme.dmSans(13f, FontWeight.SemiBold),
                        color = Theme.accent
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                }
                Text(
                    text = description,
                    style = Theme.dmSans(13f),
                    color = Theme.textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (notification.lyricSnippet != null) {
                Text(
                    text = "\"${notification.lyricSnippet}\"",
                    fontFamily = CaveatFamily,
                    fontSize = 14.sp,
                    color = Theme.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
            Text(
                text = formatRelativeTime(notification.createdAt),
                style = Theme.dmSans(11f),
                color = Theme.textMuted,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

private fun buildNotificationText(notification: AppNotification): String {
    return when (notification.type) {
        "comment" -> "commented on your earwyrm"
        "reaction" -> "resonated with your earwyrm"
        "share" -> "shared an earwyrm with you"
        "follow" -> "started following you"
        "collection" -> "added your earwyrm to a collection"
        else -> "interacted with your earwyrm"
    }
}
