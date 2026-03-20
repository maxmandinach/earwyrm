package com.earwyrm.app.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.feature.artgallery.ArtGallerySection
import com.earwyrm.app.feature.artgallery.ArtGalleryViewModel
import com.earwyrm.app.feature.artgallery.ArtGenerationSheet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditLyricSheet(
    lyric: Lyric,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit,
    artGalleryViewModel: ArtGalleryViewModel? = null,
    isPlus: Boolean = false,
    noteContent: String = "",
    onNavigateToPaywall: () -> Unit = {}
) {
    var content by remember { mutableStateOf(lyric.content) }
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
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            Text(
                "Edit Lyric",
                style = Theme.dmSans(18f, FontWeight.SemiBold),
                color = Theme.textPrimary
            )

            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = content,
                onValueChange = { if (it.length <= 500) content = it },
                modifier = Modifier.fillMaxWidth(),
                textStyle = Theme.caveat(22f),
                minLines = 3,
                maxLines = 8,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Theme.accent,
                    cursorColor = Theme.accent
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(Modifier.height(8.dp))

            Text(
                "${content.length}/500",
                style = Theme.dmSans(11f),
                color = Theme.textMuted
            )

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

            Button(
                onClick = {
                    artGalleryViewModel?.persistSelection(lyric.id)
                    onSave(content)
                },
                Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                enabled = content.isNotBlank() && (content != lyric.content || artGalleryViewModel != null),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Theme.accent,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Save", style = Theme.dmSans(16f, FontWeight.SemiBold))
            }

            Spacer(Modifier.height(24.dp))
        }
    }

    // Art generation sheet
    if (showGenSheet && artGalleryViewModel != null) {
        ArtGenerationSheet(
            isPlus = isPlus,
            hasExistingArt = artGalleryViewModel.hasAIArt,
            existingNote = noteContent.ifEmpty { null },
            artRemaining = artState?.artRemaining,
            onGenerate = { note, refinement ->
                artGalleryViewModel.generate(lyric, note, refinement)
            },
            onShowPaywall = onNavigateToPaywall,
            onDismiss = { showGenSheet = false }
        )
    }
}
