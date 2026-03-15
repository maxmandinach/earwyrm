package com.earwyrm.app.feature.postlyric

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.MBArtist

@Composable
fun ArtistAutocomplete(
    value: String,
    onValueChange: (String) -> Unit,
    suggestions: List<MBArtist>,
    onSelect: (MBArtist) -> Unit
) {
    Column {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text("Artist", style = Theme.dmSans(14f)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            textStyle = Theme.dmSans(14f),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Theme.accent,
                cursorColor = Theme.accent,
                focusedLabelColor = Theme.accent
            ),
            shape = RoundedCornerShape(12.dp)
        )

        if (suggestions.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
            ) {
                suggestions.take(5).forEach { artist ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(artist) }
                            .padding(horizontal = 12.dp, vertical = 10.dp)
                    ) {
                        Text(
                            text = artist.name,
                            style = Theme.dmSans(14f, FontWeight.Medium),
                            color = Theme.textPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        if (artist.disambiguation != null) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = artist.disambiguation,
                                style = Theme.dmSans(12f),
                                color = Theme.textMuted,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                    HorizontalDivider(color = Theme.divider)
                }
            }
        }
    }
}
