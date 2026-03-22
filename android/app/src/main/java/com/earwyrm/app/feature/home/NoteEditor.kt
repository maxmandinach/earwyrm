package com.earwyrm.app.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.LyricNote

@Composable
fun NoteEditor(note: LyricNote?, onSave: (String, Boolean) -> Unit) {
    var content by remember { mutableStateOf(note?.content ?: "") }
    var isPublic by remember { mutableStateOf(note?.isPublic ?: false) }
    var isDirty by remember { mutableStateOf(false) }
    var expanded by remember { mutableStateOf(true) }
    LaunchedEffect(note) { content = note?.content ?: ""; isPublic = note?.isPublic ?: false; isDirty = false }

    Card(
        Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            // Header row with lock icon and collapse toggle
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded }
            ) {
                if (!isPublic) {
                    Icon(
                        Icons.Filled.Lock,
                        contentDescription = "Private note",
                        tint = Theme.textMuted,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(Modifier.width(4.dp))
                }
                Text(
                    "Personal Note",
                    style = Theme.dmSans(14f, FontWeight.SemiBold),
                    color = Theme.textSecondary
                )
                Spacer(Modifier.weight(1f))
                Icon(
                    if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = if (expanded) "Collapse" else "Expand",
                    tint = Theme.textMuted,
                    modifier = Modifier.size(18.dp)
                )
            }

            if (expanded) {
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = content,
                    onValueChange = { if (it.length <= 500) { content = it; isDirty = true } },
                    placeholder = {
                        Text(
                            "Why is this stuck in your head?",
                            style = Theme.dmSansItalic(14f)
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = Theme.dmSansItalic(14f),
                    minLines = 2,
                    maxLines = 5,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Theme.accent,
                        cursorColor = Theme.accent
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Public", style = Theme.dmSans(13f), color = Theme.textSecondary)
                    Switch(
                        checked = isPublic,
                        onCheckedChange = { isPublic = it; isDirty = true },
                        colors = SwitchDefaults.colors(checkedTrackColor = Theme.accent),
                        modifier = Modifier.padding(start = 8.dp)
                    )
                    Spacer(Modifier.weight(1f))
                    if (isDirty) {
                        TextButton(onClick = { onSave(content, isPublic); isDirty = false }) {
                            Text(
                                "Save",
                                style = Theme.dmSans(13f, FontWeight.SemiBold),
                                color = Theme.accent
                            )
                        }
                    }
                    Text(
                        "${content.length}/500",
                        style = Theme.dmSans(11f),
                        color = Theme.textMuted
                    )
                }
            }
        }
    }
}
