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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditLyricSheet(lyric: Lyric, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var content by remember { mutableStateOf(lyric.content) }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Theme.card) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp)) {
            Text("Edit Lyric", style = Theme.dmSans(18f, FontWeight.SemiBold), color = Theme.textPrimary)
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(value = content, onValueChange = { if (it.length <= 500) content = it }, modifier = Modifier.fillMaxWidth(), textStyle = Theme.caveat(22f), minLines = 3, maxLines = 8, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Theme.accent, cursorColor = Theme.accent), shape = RoundedCornerShape(12.dp))
            Spacer(Modifier.height(8.dp)); Text("${content.length}/500", style = Theme.dmSans(11f), color = Theme.textMuted)
            Spacer(Modifier.height(16.dp))
            Button(onClick = { onSave(content) }, Modifier.fillMaxWidth().height(48.dp), enabled = content.isNotBlank() && content != lyric.content, colors = ButtonDefaults.buttonColors(containerColor = Theme.accent, contentColor = Color.White), shape = RoundedCornerShape(12.dp)) { Text("Save", style = Theme.dmSans(16f, FontWeight.SemiBold)) }
            Spacer(Modifier.height(24.dp))
        }
    }
}
