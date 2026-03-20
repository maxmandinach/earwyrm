package com.earwyrm.app.feature.profile

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavHostController
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.design.AppThemeMode
import com.earwyrm.app.core.design.AppearanceManager
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics
import com.earwyrm.app.core.model.Profile
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.core.subscription.BillingManager
import com.earwyrm.app.core.supabase.BlockManager
import com.earwyrm.app.feature.subscription.TipJarSheet
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject

@Serializable
data class BlockedUserProfile(
    val id: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    val authManager: AuthManager,
    val appearanceManager: AppearanceManager,
    val blockManager: BlockManager,
    val billingManager: BillingManager,
    private val supabase: SupabaseClient
) : ViewModel() {

    // Edit Profile state
    private val _displayName = MutableStateFlow("")
    val displayName: StateFlow<String> = _displayName.asStateFlow()

    private val _bio = MutableStateFlow("")
    val bio: StateFlow<String> = _bio.asStateFlow()

    private val _isPublic = MutableStateFlow(true)
    val isPublic: StateFlow<Boolean> = _isPublic.asStateFlow()

    private val _isSaving = MutableStateFlow(false)
    val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()

    private val _saveMessage = MutableStateFlow<String?>(null)
    val saveMessage: StateFlow<String?> = _saveMessage.asStateFlow()

    // Blocked users state
    private val _blockedProfiles = MutableStateFlow<List<BlockedUserProfile>>(emptyList())
    val blockedProfiles: StateFlow<List<BlockedUserProfile>> = _blockedProfiles.asStateFlow()

    private val _isLoadingBlocked = MutableStateFlow(false)
    val isLoadingBlocked: StateFlow<Boolean> = _isLoadingBlocked.asStateFlow()

    init {
        val profile = authManager.profile.value
        if (profile != null) {
            _displayName.value = profile.displayName ?: ""
            _bio.value = profile.bio ?: ""
            _isPublic.value = profile.isPublic ?: true
        }
        loadBlockedProfiles()
    }

    fun updateDisplayName(value: String) { _displayName.value = value }
    fun updateBio(value: String) { _bio.value = value }
    fun updateIsPublic(value: Boolean) { _isPublic.value = value }

    fun saveProfile() {
        val uid = authManager.userId ?: return
        viewModelScope.launch {
            _isSaving.value = true
            _saveMessage.value = null
            try {
                supabase.postgrest.from("profiles").update({
                    set("display_name", _displayName.value.ifBlank { null })
                    set("bio", _bio.value.ifBlank { null })
                    set("is_public", _isPublic.value)
                }) {
                    filter { eq("id", uid) }
                }
                authManager.fetchProfile()
                _saveMessage.value = "Profile saved"
            } catch (e: Exception) {
                _saveMessage.value = "Failed to save: ${e.message}"
            } finally {
                _isSaving.value = false
            }
        }
    }

    private fun loadBlockedProfiles() {
        val uid = authManager.userId ?: return
        viewModelScope.launch {
            _isLoadingBlocked.value = true
            try {
                blockManager.fetchBlockedUsers(uid)
                val ids = blockManager.blockedUserIds.value.toList()
                if (ids.isNotEmpty()) {
                    _blockedProfiles.value = supabase.postgrest.from("profiles")
                        .select {
                            filter { isIn("id", ids) }
                        }
                        .decodeList<BlockedUserProfile>()
                } else {
                    _blockedProfiles.value = emptyList()
                }
            } catch (_: Exception) {
                _blockedProfiles.value = emptyList()
            } finally {
                _isLoadingBlocked.value = false
            }
        }
    }

    fun unblockUser(blockedUserId: String) {
        val uid = authManager.userId ?: return
        viewModelScope.launch {
            blockManager.unblockUser(uid, blockedUserId)
            _blockedProfiles.value = _blockedProfiles.value.filter { it.id != blockedUserId }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    navController: NavHostController,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()
    val profile by viewModel.authManager.profile.collectAsState()
    val session by viewModel.authManager.session.collectAsState()
    val themeMode by viewModel.appearanceManager.themeMode.collectAsState()
    val displayName by viewModel.displayName.collectAsState()
    val bio by viewModel.bio.collectAsState()
    val isPublic by viewModel.isPublic.collectAsState()
    val isSaving by viewModel.isSaving.collectAsState()
    val saveMessage by viewModel.saveMessage.collectAsState()
    val blockedProfiles by viewModel.blockedProfiles.collectAsState()
    val isLoadingBlocked by viewModel.isLoadingBlocked.collectAsState()
    var showTipJar by remember { mutableStateOf(false) }
    val haptics = rememberHaptics()
    val snackbarHostState = remember { SnackbarHostState() }

    // Show snackbar when profile is saved
    LaunchedEffect(saveMessage) {
        if (saveMessage == "Profile saved") {
            haptics.success()
            snackbarHostState.showSnackbar("Profile updated")
        }
    }

    // Sync profile data when it changes
    LaunchedEffect(profile) {
        profile?.let {
            viewModel.updateDisplayName(it.displayName ?: "")
            viewModel.updateBio(it.bio ?: "")
            viewModel.updateIsPublic(it.isPublic ?: true)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        TopAppBar(
            title = {
                Text(
                    "Settings",
                    style = Theme.dmSans(18f, FontWeight.SemiBold),
                    color = Theme.textPrimary
                )
            },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Theme.textPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp)
                .animateContentSize()
        ) {
            // ── Edit Profile Section ──
            SectionHeader("Edit Profile")
            Spacer(Modifier.height(8.dp))

            val textFieldColors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Theme.textPrimary,
                unfocusedTextColor = Theme.textPrimary,
                cursorColor = Theme.accent,
                focusedBorderColor = Theme.accent,
                unfocusedBorderColor = Theme.divider,
                focusedLabelColor = Theme.accent,
                unfocusedLabelColor = Theme.textMuted
            )

            OutlinedTextField(
                value = displayName,
                onValueChange = { viewModel.updateDisplayName(it) },
                label = { Text("Display Name") },
                singleLine = true,
                colors = textFieldColors,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = bio,
                onValueChange = { viewModel.updateBio(it) },
                label = { Text("Bio") },
                minLines = 2,
                maxLines = 4,
                colors = textFieldColors,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Public Profile",
                    style = Theme.dmSans(15f),
                    color = Theme.textPrimary
                )
                Switch(
                    checked = isPublic,
                    onCheckedChange = { viewModel.updateIsPublic(it) },
                    colors = SwitchDefaults.colors(
                        checkedTrackColor = Theme.accent,
                        checkedThumbColor = Color.White
                    )
                )
            }

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    onClick = { viewModel.saveProfile() },
                    enabled = !isSaving,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Theme.accent,
                        contentColor = Color.White,
                        disabledContainerColor = Theme.accent.copy(alpha = 0.5f)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                        Spacer(Modifier.width(8.dp))
                    }
                    Text("Save", style = Theme.dmSans(14f, FontWeight.SemiBold))
                }

                if (saveMessage != null) {
                    Text(
                        saveMessage!!,
                        style = Theme.dmSans(13f),
                        color = if (saveMessage!!.startsWith("Failed")) Theme.error else Theme.success
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
            HorizontalDivider(color = Theme.divider)
            Spacer(Modifier.height(16.dp))

            // ── Appearance Section ──
            SectionHeader("Appearance")
            Spacer(Modifier.height(8.dp))

            val themeModes = listOf(
                AppThemeMode.SYSTEM to "System",
                AppThemeMode.LIGHT to "Light",
                AppThemeMode.DARK to "Dark"
            )
            themeModes.forEach { (mode, label) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { viewModel.appearanceManager.setThemeMode(mode) }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = themeMode == mode,
                        onClick = { viewModel.appearanceManager.setThemeMode(mode) },
                        colors = RadioButtonDefaults.colors(
                            selectedColor = Theme.accent,
                            unselectedColor = Theme.textMuted
                        )
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        label,
                        style = Theme.dmSans(15f),
                        color = Theme.textPrimary
                    )
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = Theme.divider)
            Spacer(Modifier.height(16.dp))

            // ── Blocked Users Section ──
            SectionHeader("Blocked Users")
            Spacer(Modifier.height(8.dp))

            if (isLoadingBlocked) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Theme.accent,
                        strokeWidth = 2.dp
                    )
                }
            } else if (blockedProfiles.isEmpty()) {
                Text(
                    "No blocked users",
                    style = Theme.dmSans(14f),
                    color = Theme.textMuted,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            } else {
                blockedProfiles.forEach { blockedUser ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                blockedUser.displayName ?: blockedUser.username,
                                style = Theme.dmSans(15f, FontWeight.Medium),
                                color = Theme.textPrimary
                            )
                            Text(
                                "@${blockedUser.username}",
                                style = Theme.dmSans(13f),
                                color = Theme.textMuted
                            )
                        }
                        OutlinedButton(
                            onClick = { viewModel.unblockUser(blockedUser.id) },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Theme.error
                            )
                        ) {
                            Text(
                                "Unblock",
                                style = Theme.dmSans(13f, FontWeight.Medium)
                            )
                        }
                    }
                    HorizontalDivider(color = Theme.divider)
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = Theme.divider)
            Spacer(Modifier.height(16.dp))

            // ── Account Section ──
            SectionHeader("Account")
            Spacer(Modifier.height(8.dp))

            AccountRow(
                label = "Email",
                value = session?.user?.email ?: "Not available"
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { navController.navigate(Screen.PlusPaywall.route) }
                    .padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Subscription",
                    style = Theme.dmSans(15f),
                    color = Theme.textPrimary
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        when (profile?.subscriptionTier) {
                            "plus" -> "Earwyrm Plus"
                            else -> "Free"
                        },
                        style = Theme.dmSans(14f),
                        color = Theme.accent
                    )
                    Text(
                        "\u203A",
                        style = Theme.dmSans(16f),
                        color = Theme.textMuted
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { showTipJar = true }
                    .padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Tip Jar",
                    style = Theme.dmSans(15f),
                    color = Theme.textPrimary
                )
                Text(
                    "\u203A",
                    style = Theme.dmSans(16f),
                    color = Theme.textMuted
                )
            }

            Spacer(Modifier.height(24.dp))

            // ── Sign Out ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .clickable {
                        scope.launch { viewModel.authManager.signOut() }
                    }
                    .padding(vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Sign Out",
                    style = Theme.dmSans(16f, FontWeight.Medium),
                    color = Theme.error
                )
            }

            Spacer(Modifier.height(48.dp))
        }
    }
    SnackbarHost(hostState = snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 16.dp))
    }

    if (showTipJar) {
        TipJarSheet(
            billingManager = viewModel.billingManager,
            onDismiss = { showTipJar = false }
        )
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = Theme.dmSans(13f, FontWeight.SemiBold),
        color = Theme.textMuted,
        modifier = Modifier.padding(top = 8.dp)
    )
}

@Composable
private fun AccountRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            label,
            style = Theme.dmSans(15f),
            color = Theme.textPrimary
        )
        Text(
            value,
            style = Theme.dmSans(14f),
            color = Theme.textSecondary
        )
    }
}
