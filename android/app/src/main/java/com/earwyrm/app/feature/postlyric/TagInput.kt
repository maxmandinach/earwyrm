package com.earwyrm.app.feature.postlyric

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TagInput(
    tags: List<String>,
    onAddTag: (String) -> Unit,
    onRemoveTag: (String) -> Unit
) {
    var tagText by remember { mutableStateOf("") }

    OutlinedTextField(
        value = tagText,
        onValueChange = { tagText = it.replace(" ", "") },
        label = { Text("Tags", style = Theme.dmSans(14f)) },
        placeholder = { Text("Add a tag...", style = Theme.dmSans(14f)) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        textStyle = Theme.dmSans(14f),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(
            onDone = {
                if (tagText.isNotBlank()) {
                    onAddTag(tagText)
                    tagText = ""
                }
            }
        ),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Theme.accent,
            cursorColor = Theme.accent,
            focusedLabelColor = Theme.accent
        ),
        shape = RoundedCornerShape(12.dp)
    )

    if (tags.isNotEmpty()) {
        FlowRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            tags.forEach { tag ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(Theme.accent.copy(alpha = 0.15f))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "#$tag",
                        style = Theme.dmSans(13f),
                        color = Theme.accent
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Remove",
                        tint = Theme.accent,
                        modifier = Modifier
                            .size(14.dp)
                            .clickable { onRemoveTag(tag) }
                    )
                }
            }
        }
    }
}
