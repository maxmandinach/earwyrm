package com.earwyrm.app.feature.postlyric

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.MappedRecording

@Composable
fun SongAutocomplete(
    value: String,
    onValueChange: (String) -> Unit,
    suggestions: List<MappedRecording>,
    onSelect: (MappedRecording) -> Unit
) {
    Column {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text("Song Title", style = Theme.dmSans(14f)) },
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
                suggestions.take(5).forEach { recording ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(recording) }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Cover art thumbnail from MusicBrainz release group
                        if (recording.releaseGroupId != null) {
                            AsyncImage(
                                model = "https://coverartarchive.org/release-group/${recording.releaseGroupId}/front-250",
                                contentDescription = null,
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(6.dp)),
                                contentScale = ContentScale.Crop
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = recording.title,
                                style = Theme.dmSans(14f, FontWeight.Medium),
                                color = Theme.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (recording.artist != null) {
                                Text(
                                    text = recording.artist,
                                    style = Theme.dmSans(12f),
                                    color = Theme.textSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            if (recording.album != null) {
                                Text(
                                    text = recording.album,
                                    style = Theme.dmSans(11f),
                                    color = Theme.textMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                        if (recording.year != null) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = recording.year,
                                style = Theme.dmSans(11f),
                                color = Theme.textMuted
                            )
                        }
                    }
                    HorizontalDivider(color = Theme.divider)
                }
            }
        }
    }
}
