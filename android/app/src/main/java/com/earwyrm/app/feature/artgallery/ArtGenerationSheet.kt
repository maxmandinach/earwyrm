package com.earwyrm.app.feature.artgallery

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme

/**
 * Bottom sheet for art generation — note entry + optional art direction (Plus only).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArtGenerationSheet(
    isPlus: Boolean,
    hasExistingArt: Boolean,
    existingNote: String?,
    artRemaining: Int?,
    onGenerate: (note: String?, refinement: String?) -> Unit,
    onShowPaywall: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var noteText by remember { mutableStateOf(existingNote ?: "") }
    var artDirection by remember { mutableStateOf("") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Theme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Title
            Text(
                text = if (hasExistingArt) "Generate New Artwork" else "Create Your Artwork",
                style = Theme.dmSans(20f, FontWeight.SemiBold),
                color = Theme.textPrimary,
                modifier = Modifier.fillMaxWidth()
            )

            // Note field
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(
                    text = "your note",
                    style = Theme.dmSans(14f, FontWeight.Medium),
                    color = Theme.textPrimary
                )

                if (existingNote == null) {
                    Text(
                        text = "what does this lyric mean to you? saves to your lyric card \u00B7 private by default \u00B7 shapes your artwork",
                        style = Theme.dmSans(12f),
                        color = Theme.textMuted
                    )
                }
            }

            OutlinedTextField(
                value = noteText,
                onValueChange = { noteText = it },
                placeholder = {
                    Text(
                        "what does this lyric mean to you?",
                        style = Theme.dmSans(15f),
                        color = Theme.textMuted
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                textStyle = Theme.dmSans(15f),
                minLines = 2,
                maxLines = 4,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Theme.divider,
                    unfocusedBorderColor = Theme.divider,
                    cursorColor = Theme.accent,
                    focusedContainerColor = Theme.background,
                    unfocusedContainerColor = Theme.background
                ),
                shape = RoundedCornerShape(10.dp)
            )

            // Art direction — Plus only
            if (isPlus) {
                Text(
                    text = "art direction (optional)",
                    style = Theme.dmSans(14f, FontWeight.Medium),
                    color = Theme.textPrimary
                )

                OutlinedTextField(
                    value = artDirection,
                    onValueChange = { artDirection = it },
                    placeholder = {
                        Text(
                            "warmer colors, more abstract, add rain...",
                            style = Theme.dmSans(15f),
                            color = Theme.textMuted
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = Theme.dmSans(15f),
                    minLines = 1,
                    maxLines = 3,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Theme.divider,
                        unfocusedBorderColor = Theme.divider,
                        cursorColor = Theme.accent,
                        focusedContainerColor = Theme.background,
                        unfocusedContainerColor = Theme.background
                    ),
                    shape = RoundedCornerShape(10.dp)
                )
            }

            // Generate button
            Button(
                onClick = {
                    val note = noteText.trim().ifEmpty { null }
                    val refinement = artDirection.trim().ifEmpty { null }
                    onDismiss()
                    onGenerate(note, refinement)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Theme.accent,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("\u2726", style = Theme.dmSans(12f))
                    Text("Generate", style = Theme.dmSans(16f, FontWeight.SemiBold))
                }
            }

            // Footer
            if (isPlus) {
                if (artRemaining != null && artRemaining > 0) {
                    Text(
                        text = "$artRemaining generations remaining this month",
                        style = Theme.dmSans(12f),
                        color = Theme.textMuted,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Your one free generation. ",
                        style = Theme.dmSans(12f),
                        color = Theme.textMuted
                    )
                    Text(
                        text = "Get more with earwyrm+",
                        style = Theme.dmSans(12f, FontWeight.Medium).copy(
                            textDecoration = TextDecoration.Underline
                        ),
                        color = Theme.accent,
                        modifier = Modifier.clickable {
                            onDismiss()
                            onShowPaywall()
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}
