package com.earwyrm.app.feature.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Public
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.CardArtBackground
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.LyricNote
import com.earwyrm.app.feature.artgallery.ArtGallerySection
import com.earwyrm.app.feature.artgallery.ArtGalleryViewModel
import com.earwyrm.app.feature.artgallery.ArtGeneratingOverlay
import com.earwyrm.app.feature.artgallery.ArtGenerationSheet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditLyricSheet(
    lyric: Lyric,
    onDismiss: () -> Unit,
    onSave: (content: String, songTitle: String?, artistName: String?) -> Unit,
    onDelete: (String) -> Unit = {},
    onToggleVisibility: () -> Unit = {},
    onSaveNote: (content: String, isPublic: Boolean) -> Unit = { _, _ -> },
    artGalleryViewModel: ArtGalleryViewModel? = null,
    isPlus: Boolean = false,
    noteContent: String = "",
    noteIsPublic: Boolean = false,
    currentNote: LyricNote? = null,
    onNavigateToPaywall: () -> Unit = {}
) {
    var content by remember { mutableStateOf(lyric.content) }
    var songTitle by remember { mutableStateOf(lyric.songTitle ?: "") }
    var artistName by remember { mutableStateOf(lyric.artistName ?: "") }
    var isPublic by remember { mutableStateOf(lyric.isPublic ?: true) }
    var noteText by remember { mutableStateOf(currentNote?.content ?: noteContent) }
    var notePublic by remember { mutableStateOf(currentNote?.isPublic ?: noteIsPublic) }
    var isSaving by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var showGenSheet by remember { mutableStateOf(false) }

    // Load variants when the sheet opens
    LaunchedEffect(lyric.id) {
        artGalleryViewModel?.loadVariants(lyric)
    }

    val artState = artGalleryViewModel?.state?.collectAsState()?.value

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Theme.card
    ) {
        Box(Modifier.fillMaxWidth()) {
            // Cover art background at low opacity
            val artUrl = lyric.cardArtUrl ?: lyric.coverArtUrl
            if (artUrl != null) {
                CardArtBackground(
                    imageUrl = artUrl,
                    modifier = Modifier.matchParentSize(),
                    opacity = 0.05f
                )
            }

            Column(
                Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text(
                    "Edit Lyric",
                    style = Theme.dmSans(18f, FontWeight.SemiBold),
                    color = Theme.textPrimary
                )

                Spacer(Modifier.height(16.dp))

                // Song title field
                OutlinedTextField(
                    value = songTitle,
                    onValueChange = { songTitle = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Song title", style = Theme.dmSans(13f)) },
                    textStyle = Theme.dmSans(15f),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Theme.accent,
                        cursorColor = Theme.accent,
                        focusedLabelColor = Theme.accent
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(Modifier.height(12.dp))

                // Artist name field
                OutlinedTextField(
                    value = artistName,
                    onValueChange = { artistName = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Artist name", style = Theme.dmSans(13f)) },
                    textStyle = Theme.dmSans(15f),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Theme.accent,
                        cursorColor = Theme.accent,
                        focusedLabelColor = Theme.accent
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(Modifier.height(12.dp))

                // Lyric content field
                OutlinedTextField(
                    value = content,
                    onValueChange = { if (it.length <= 500) content = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Lyric", style = Theme.dmSans(13f)) },
                    textStyle = Theme.caveat(22f),
                    minLines = 3,
                    maxLines = 8,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Theme.accent,
                        cursorColor = Theme.accent,
                        focusedLabelColor = Theme.accent
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(Modifier.height(4.dp))

                Text(
                    "${content.length}/500",
                    style = Theme.dmSans(11f),
                    color = Theme.textMuted
                )

                Spacer(Modifier.height(12.dp))

                // Visibility toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = if (isPublic) Icons.Outlined.Public else Icons.Outlined.Lock,
                            contentDescription = if (isPublic) "Public" else "Private",
                            tint = Theme.textSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            if (isPublic) "Public" else "Private",
                            style = Theme.dmSans(14f, FontWeight.Medium),
                            color = Theme.textSecondary
                        )
                    }
                    Switch(
                        checked = isPublic,
                        onCheckedChange = {
                            isPublic = it
                            onToggleVisibility()
                        },
                        colors = SwitchDefaults.colors(
                            checkedTrackColor = Theme.accent,
                            checkedThumbColor = Color.White
                        )
                    )
                }

                // Note section
                Spacer(Modifier.height(16.dp))

                Text(
                    "Note",
                    style = Theme.dmSans(14f, FontWeight.Medium),
                    color = Theme.textSecondary
                )

                Spacer(Modifier.height(8.dp))

                OutlinedTextField(
                    value = noteText,
                    onValueChange = { if (it.length <= 500) noteText = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = {
                        Text(
                            "Why is this stuck in your head?",
                            style = Theme.dmSans(14f),
                            color = Theme.textMuted
                        )
                    },
                    textStyle = Theme.dmSans(14f),
                    minLines = 2,
                    maxLines = 4,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Theme.accent,
                        cursorColor = Theme.accent
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(Modifier.height(4.dp))

                Text(
                    "${noteText.length}/500",
                    style = Theme.dmSans(11f),
                    color = Theme.textMuted
                )

                Spacer(Modifier.height(8.dp))

                // Note visibility toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = if (notePublic) Icons.Outlined.Public else Icons.Outlined.Lock,
                            contentDescription = if (notePublic) "Note public" else "Note private",
                            tint = Theme.textMuted,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            if (notePublic) "Note visible to others" else "Note private",
                            style = Theme.dmSans(13f),
                            color = Theme.textMuted
                        )
                    }
                    Switch(
                        checked = notePublic,
                        onCheckedChange = { notePublic = it },
                        colors = SwitchDefaults.colors(
                            checkedTrackColor = Theme.accent,
                            checkedThumbColor = Color.White
                        )
                    )
                }

                // Art gallery section
                if (artGalleryViewModel != null && artState != null) {
                    Spacer(Modifier.height(16.dp))

                    Text(
                        "Card Art",
                        style = Theme.dmSans(14f, FontWeight.Medium),
                        color = Theme.textSecondary
                    )

                    Spacer(Modifier.height(8.dp))

                    ArtGallerySection(
                        state = artState,
                        isPlus = isPlus,
                        onSelectNone = {
                            artGalleryViewModel.selectNone()
                        },
                        onSelectVariant = { index ->
                            artGalleryViewModel.selectVariant(index)
                        },
                        onGenerateClick = {
                            val action = artGalleryViewModel.resolveAction(
                                isPlus = isPlus,
                                freeGenExhausted = false
                            )
                            when (action) {
                                ArtGalleryViewModel.ArtAction.SHOW_GEN_SHEET -> showGenSheet = true
                                ArtGalleryViewModel.ArtAction.SHOW_PAYWALL -> onNavigateToPaywall()
                            }
                        },
                        onNavigateToPaywall = onNavigateToPaywall
                    )
                }

                Spacer(Modifier.height(16.dp))

                // Error message
                if (errorMessage != null) {
                    Text(
                        errorMessage!!,
                        style = Theme.dmSans(12f),
                        color = Theme.error,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                // Save button with loading indicator
                val hasChanges = content != lyric.content
                    || songTitle != (lyric.songTitle ?: "")
                    || artistName != (lyric.artistName ?: "")
                    || noteText != (currentNote?.content ?: noteContent)
                    || notePublic != (currentNote?.isPublic ?: noteIsPublic)
                    || artGalleryViewModel != null

                Button(
                    onClick = {
                        isSaving = true
                        errorMessage = null
                        artGalleryViewModel?.persistSelection(lyric.id)
                        // Save note if changed
                        val noteChanged = noteText != (currentNote?.content ?: noteContent)
                            || notePublic != (currentNote?.isPublic ?: noteIsPublic)
                        if (noteChanged && noteText.isNotBlank()) {
                            onSaveNote(noteText, notePublic)
                        }
                        onSave(
                            content,
                            songTitle.ifBlank { null },
                            artistName.ifBlank { null }
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    enabled = content.isNotBlank() && hasChanges && !isSaving,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Theme.accent,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Save", style = Theme.dmSans(16f, FontWeight.SemiBold))
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Delete button
                OutlinedButton(
                    onClick = { showDeleteConfirm = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Theme.error
                    ),
                    border = BorderStroke(
                        1.dp,
                        Theme.error.copy(alpha = 0.5f)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Delete", style = Theme.dmSans(16f, FontWeight.SemiBold))
                }

                Spacer(Modifier.height(24.dp))
            }
        }
    }

    // Delete confirmation dialog
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = {
                Text(
                    "Delete this earwyrm?",
                    style = Theme.dmSans(18f, FontWeight.SemiBold),
                    color = Theme.textPrimary
                )
            },
            text = {
                Text(
                    "This can't be undone.",
                    style = Theme.dmSans(14f),
                    color = Theme.textSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete(lyric.id)
                    }
                ) {
                    Text(
                        "Delete",
                        style = Theme.dmSans(14f, FontWeight.SemiBold),
                        color = Theme.error
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text(
                        "Cancel",
                        style = Theme.dmSans(14f),
                        color = Theme.textSecondary
                    )
                }
            },
            containerColor = Theme.card
        )
    }

    // Art generation sheet
    if (showGenSheet && artGalleryViewModel != null) {
        ArtGenerationSheet(
            isPlus = isPlus,
            hasExistingArt = artGalleryViewModel.hasAIArt,
            existingNote = noteText.ifEmpty { null },
            artRemaining = artState?.artRemaining,
            onGenerate = { note, refinement ->
                artGalleryViewModel.generate(lyric, note, refinement)
            },
            onShowPaywall = onNavigateToPaywall,
            onDismiss = { showGenSheet = false }
        )
    }

    // Fullscreen generating overlay
    if (artState?.isGenerating == true) {
        ArtGeneratingOverlay()
    }
}
