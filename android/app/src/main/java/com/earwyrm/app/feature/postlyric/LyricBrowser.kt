package com.earwyrm.app.feature.postlyric

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.GeniusSuggestion

@Composable
fun GeniusSuggestionChip(
    suggestion: GeniusSuggestion,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Theme.accent.copy(alpha = 0.08f)),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (suggestion.albumArt != null) {
                AsyncImage(
                    model = suggestion.albumArt,
                    contentDescription = null,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(6.dp)),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = suggestion.title,
                    style = Theme.dmSans(13f, FontWeight.Medium),
                    color = Theme.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (suggestion.artist != null) {
                    Text(
                        text = suggestion.artist,
                        style = Theme.dmSans(11f),
                        color = Theme.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LyricBrowserSheet(
    lyrics: String,
    isLoading: Boolean,
    onSelectLines: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Theme.card,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp)
        ) {
            Text(
                "browse lyrics",
                style = Theme.caveat(22f, FontWeight.Bold),
                color = Theme.accent,
                modifier = Modifier.padding(bottom = 4.dp)
            )
            Text(
                "Tap a line to start, tap another to end selection",
                style = Theme.dmSans(12f),
                color = Theme.textMuted,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Theme.accent, modifier = Modifier.size(24.dp))
                }
            } else if (lyrics.isBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No lyrics found", style = Theme.dmSans(14f), color = Theme.textMuted)
                }
            } else {
                val lines = remember(lyrics) {
                    lyrics.lines().map { line ->
                        // Strip LRCLIB synced timestamps like [00:12.34]
                        line.replace(Regex("^\\[\\d{2}:\\d{2}\\.\\d{2,3}]\\s*"), "")
                    }.filter { it.isNotBlank() }
                }
                var startIndex by remember { mutableIntStateOf(-1) }
                var endIndex by remember { mutableIntStateOf(-1) }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f, fill = false)
                        .height(400.dp)
                ) {
                    itemsIndexed(lines) { index, line ->
                        val isSelected = startIndex >= 0 && endIndex >= 0 &&
                                index in minOf(startIndex, endIndex)..maxOf(startIndex, endIndex)
                        val isEndpoint = index == startIndex || index == endIndex
                        val bgColor by animateColorAsState(
                            targetValue = when {
                                isEndpoint -> Theme.accent.copy(alpha = 0.2f)
                                isSelected -> Theme.accent.copy(alpha = 0.1f)
                                else -> Color.Transparent
                            },
                            label = "lineBg"
                        )
                        Text(
                            text = line,
                            style = Theme.dmSans(14f, if (isSelected) FontWeight.Medium else FontWeight.Normal),
                            color = if (isSelected) Theme.textPrimary else Theme.textSecondary,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(6.dp))
                                .background(bgColor)
                                .clickable {
                                    when {
                                        startIndex < 0 -> { startIndex = index; endIndex = index }
                                        endIndex == startIndex && index == startIndex -> { startIndex = -1; endIndex = -1 }
                                        else -> { endIndex = index }
                                    }
                                }
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }

                if (startIndex >= 0 && endIndex >= 0) {
                    val selectedText = lines.subList(
                        minOf(startIndex, endIndex),
                        maxOf(startIndex, endIndex) + 1
                    ).joinToString("\n")

                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = { onSelectLines(selectedText) },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Theme.accent,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Use selected", style = Theme.dmSans(14f, FontWeight.SemiBold))
                    }
                }
            }
        }
    }
}
