package com.earwyrm.app.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.PlusBadge
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Comment
import com.earwyrm.app.core.model.Profile

@Composable
fun CommentSection(comments: List<Comment>, profiles: Map<String, Profile>, currentUserId: String?, onSubmitComment: (String, String?) -> Unit, onDeleteComment: (String) -> Unit) {
    var commentText by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<Comment?>(null) }
    Column(Modifier.fillMaxWidth()) {
        if (comments.isNotEmpty()) Text("Comments", style = Theme.dmSans(14f, FontWeight.SemiBold), color = Theme.textSecondary, modifier = Modifier.padding(bottom = 8.dp))
        comments.filter { it.parentCommentId == null }.forEach { comment ->
            CommentItem(comment, profiles[comment.userId], comment.userId == currentUserId, onReply = { replyTo = comment; commentText = "@${profiles[comment.userId]?.username ?: ""} " }, onDelete = { onDeleteComment(comment.id) })
            comments.filter { it.parentCommentId == comment.id }.forEach { reply ->
                Row(Modifier.padding(start = 24.dp)) { Box(Modifier.width(2.dp).height(40.dp).background(Theme.divider)); Spacer(Modifier.width(8.dp)); CommentItem(reply, profiles[reply.userId], reply.userId == currentUserId, null, { onDeleteComment(reply.id) }, Modifier.weight(1f)) }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(value = commentText, onValueChange = { if (it.length <= 280) commentText = it }, placeholder = { Text(if (replyTo != null) "Reply..." else "Add a comment...", style = Theme.dmSans(13f)) }, modifier = Modifier.weight(1f), singleLine = true, textStyle = Theme.dmSans(13f), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Theme.accent, cursorColor = Theme.accent), shape = RoundedCornerShape(20.dp), keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send), keyboardActions = KeyboardActions(onSend = { if (commentText.isNotBlank()) { onSubmitComment(commentText, replyTo?.id); commentText = ""; replyTo = null } }))
            IconButton(onClick = { if (commentText.isNotBlank()) { onSubmitComment(commentText, replyTo?.id); commentText = ""; replyTo = null } }, enabled = commentText.isNotBlank()) { Icon(Icons.Default.Send, "Send", tint = if (commentText.isNotBlank()) Theme.accent else Theme.textMuted, modifier = Modifier.size(20.dp)) }
        }
        if (replyTo != null) Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) { Text("Replying to @${profiles[replyTo?.userId]?.username ?: "..."}", style = Theme.dmSans(11f), color = Theme.textMuted); Spacer(Modifier.width(8.dp)); Text("Cancel", style = Theme.dmSans(11f, FontWeight.SemiBold), color = Theme.accent, modifier = Modifier.clickable { replyTo = null; commentText = "" }) }
    }
}

@Composable
private fun CommentItem(comment: Comment, profile: Profile?, isOwn: Boolean, onReply: (() -> Unit)?, onDelete: () -> Unit, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) { Text(profile?.username ?: "...", style = Theme.dmSans(12f, FontWeight.SemiBold), color = Theme.textPrimary); if (profile?.isPlus == true) { Spacer(Modifier.width(4.dp)); PlusBadge() } }
            Text(comment.content, style = Theme.dmSans(13f), color = Theme.textPrimary, modifier = Modifier.padding(top = 2.dp))
        }
        Row { onReply?.let { IconButton(onClick = it, Modifier.size(28.dp)) { Icon(Icons.Default.Reply, "Reply", tint = Theme.textMuted, modifier = Modifier.size(14.dp)) } }; if (isOwn) IconButton(onClick = onDelete, Modifier.size(28.dp)) { Icon(Icons.Default.Delete, "Delete", tint = Theme.textMuted, modifier = Modifier.size(14.dp)) } }
    }
}
