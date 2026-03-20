package com.earwyrm.app.feature.home

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import coil.compose.AsyncImage
import com.earwyrm.app.core.design.CardArtBackground
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.ResonateIcon
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.model.LyricNote
import com.earwyrm.app.core.navigation.Screen
import com.earwyrm.app.core.util.formatRelativeTime

@Composable
fun LyricCardView(lyric: Lyric, note: LyricNote?, isCurrent: Boolean, hasReacted: Boolean, reactionCount: Int, onReactionToggle: () -> Unit, onVisibilityToggle: () -> Unit, onCommentClick: () -> Unit, onShareClick: () -> Unit, onEditClick: () -> Unit = {}, onSaveClick: () -> Unit = {}, navController: NavHostController) {
    val reactionScale by animateFloatAsState(1.0f, spring(0.4f, 300f), label = "reaction")
    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Theme.card), shape = RoundedCornerShape(16.dp), elevation = CardDefaults.cardElevation(2.dp)) {
        Box {
            CardArtBackground(imageUrl = lyric.cardArtUrl ?: lyric.coverArtUrl)
        Column(Modifier.padding(16.dp)) {
            if (lyric.songTitle != null || lyric.coverArtUrl != null) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().then(if (lyric.songTitle != null) Modifier.clickable { navController.navigate(Screen.SongPage.createRoute(lyric.songTitle, lyric.artistName)) } else Modifier)) {
                    if (lyric.coverArtUrl != null) { AsyncImage(lyric.coverArtUrl, "Album art", Modifier.size(48.dp).clip(RoundedCornerShape(8.dp)), contentScale = ContentScale.Crop); Spacer(Modifier.width(12.dp)) }
                    Column(Modifier.weight(1f)) { lyric.songTitle?.let { Text(it, style = Theme.dmSans(15f, FontWeight.SemiBold), color = Theme.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis) }; lyric.artistName?.let { Text(it, style = Theme.dmSans(13f), color = Theme.textSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis) } }
                }; Spacer(Modifier.height(12.dp))
            }
            Text(lyric.content, fontFamily = CaveatFamily, fontSize = 22.sp, fontWeight = FontWeight.Medium, color = Theme.textPrimary, lineHeight = 30.sp)
            if (note != null && note.content.isNotBlank()) { Spacer(Modifier.height(8.dp)); Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Theme.divider.copy(alpha = 0.3f)).padding(8.dp)) { Text(note.content, style = Theme.dmSansItalic(13f), color = Theme.textSecondary, maxLines = 3, overflow = TextOverflow.Ellipsis) } }
            if (!lyric.tags.isNullOrEmpty()) { Spacer(Modifier.height(8.dp)); Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { lyric.tags.take(3).forEach { Text("#$it", style = Theme.dmSans(12f), color = Theme.accent, modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Theme.accent.copy(alpha = 0.1f)).padding(horizontal = 6.dp, vertical = 2.dp)) } } }
            Spacer(Modifier.height(8.dp)); Text(formatRelativeTime(lyric.createdAt), style = Theme.dmSans(11f), color = Theme.textMuted)
            if (isCurrent) {
                Spacer(Modifier.height(8.dp)); Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically) { IconButton(onClick = onReactionToggle, Modifier.scale(reactionScale)) { ResonateIcon(isActive = hasReacted, modifier = Modifier.size(20.dp)) }; if (reactionCount > 0) Text("$reactionCount", style = Theme.dmSans(13f), color = Theme.textSecondary) }
                    Row(verticalAlignment = Alignment.CenterVertically) { IconButton(onClick = onCommentClick) { Icon(Icons.Filled.ChatBubbleOutline, "Comments", tint = Theme.textMuted, modifier = Modifier.size(20.dp)) }; (lyric.commentCount ?: 0).let { if (it > 0) Text("$it", style = Theme.dmSans(13f), color = Theme.textSecondary) } }
                    IconButton(onClick = onSaveClick) { Icon(Icons.Filled.BookmarkBorder, "Save", tint = Theme.textMuted, modifier = Modifier.size(20.dp)) }
                    IconButton(onClick = onVisibilityToggle) { Icon(if (lyric.isPublic == true) Icons.Filled.Visibility else Icons.Filled.VisibilityOff, "Toggle visibility", tint = Theme.textMuted, modifier = Modifier.size(20.dp)) }
                    IconButton(onClick = onEditClick) { Icon(Icons.Filled.Edit, "Edit", tint = Theme.textMuted, modifier = Modifier.size(20.dp)) }
                    IconButton(onClick = onShareClick) { Icon(Icons.Filled.Share, "Share", tint = Theme.textMuted, modifier = Modifier.size(20.dp)) }
                }
            }
        }
        }
    }
}

