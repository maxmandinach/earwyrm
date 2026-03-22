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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.PlusBadge
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Comment
import com.earwyrm.app.core.model.Profile

@Composable
fun CommentSection(
    comments: List<Comment>,
    profiles: Map<String, Profile>,
    currentUserId: String?,
    onSubmitComment: (String, String?) -> Unit,
    onDeleteComment: (String) -> Unit,
    onUsernameClick: ((String) -> Unit)? = null
) {
    var commentText by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<Comment?>(null) }
    var expanded by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxWidth()) {
        // Section header with count
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
                .padding(bottom = 8.dp)
        ) {
            Text(
                "Comments",
                style = Theme.dmSans(14f, FontWeight.SemiBold),
                color = Theme.textSecondary
            )
            if (comments.isNotEmpty()) {
                Spacer(Modifier.width(6.dp))
                Text(
                    "${comments.size}",
                    style = Theme.dmSans(12f),
                    color = Theme.textMuted
                )
            }
            Spacer(Modifier.weight(1f))
            Icon(
                if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = if (expanded) "Collapse" else "Expand",
                tint = Theme.textMuted,
                modifier = Modifier.size(18.dp)
            )
        }

        if (comments.isEmpty()) {
            // Empty state
            Text(
                "be the first to share a thought",
                style = Theme.dmSans(13f),
                color = Theme.textMuted,
                modifier = Modifier.padding(bottom = 8.dp)
            )
        } else if (!expanded) {
            // Collapsed preview: show top comment as a pill
            val topComment = comments.filter { it.parentCommentId == null }.firstOrNull()
            if (topComment != null) {
                val profile = profiles[topComment.userId]
                Box(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Theme.divider.copy(alpha = 0.2f))
                        .clickable { expanded = true }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            profile?.username ?: "...",
                            style = Theme.dmSans(12f, FontWeight.SemiBold),
                            color = Theme.textSecondary
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            topComment.content,
                            style = Theme.dmSans(12f),
                            color = Theme.textPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
        }

        if (expanded) {
            // Full comment list
            comments.filter { it.parentCommentId == null }.forEach { comment ->
                CommentItem(
                    comment,
                    profiles[comment.userId],
                    comment.userId == currentUserId,
                    onReply = {
                        replyTo = comment
                        commentText = "@${profiles[comment.userId]?.username ?: ""} "
                    },
                    onDelete = { onDeleteComment(comment.id) },
                    onUsernameClick = onUsernameClick
                )
                comments.filter { it.parentCommentId == comment.id }.forEach { reply ->
                    Row(Modifier.padding(start = 24.dp)) {
                        Box(
                            Modifier
                                .width(2.dp)
                                .height(40.dp)
                                .background(Theme.divider)
                        )
                        Spacer(Modifier.width(8.dp))
                        CommentItem(
                            reply,
                            profiles[reply.userId],
                            reply.userId == currentUserId,
                            null,
                            { onDeleteComment(reply.id) },
                            onUsernameClick = onUsernameClick,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        // Input row (always visible)
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = commentText,
                onValueChange = { if (it.length <= 280) commentText = it },
                placeholder = {
                    Text(
                        if (replyTo != null) "Reply..." else "Add a comment...",
                        style = Theme.dmSans(13f)
                    )
                },
                modifier = Modifier.weight(1f),
                singleLine = true,
                textStyle = Theme.dmSans(13f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Theme.accent,
                    cursorColor = Theme.accent
                ),
                shape = RoundedCornerShape(20.dp),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = {
                    if (commentText.isNotBlank()) {
                        onSubmitComment(commentText, replyTo?.id)
                        commentText = ""
                        replyTo = null
                    }
                })
            )
            IconButton(
                onClick = {
                    if (commentText.isNotBlank()) {
                        onSubmitComment(commentText, replyTo?.id)
                        commentText = ""
                        replyTo = null
                    }
                },
                enabled = commentText.isNotBlank()
            ) {
                Icon(
                    Icons.Default.Send,
                    "Send",
                    tint = if (commentText.isNotBlank()) Theme.accent else Theme.textMuted,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
        if (replyTo != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 4.dp)
            ) {
                Text(
                    "Replying to @${profiles[replyTo?.userId]?.username ?: "..."}",
                    style = Theme.dmSans(11f),
                    color = Theme.textMuted
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "Cancel",
                    style = Theme.dmSans(11f, FontWeight.SemiBold),
                    color = Theme.accent,
                    modifier = Modifier.clickable { replyTo = null; commentText = "" }
                )
            }
        }
    }
}

@Composable
private fun CommentItem(
    comment: Comment,
    profile: Profile?,
    isOwn: Boolean,
    onReply: (() -> Unit)?,
    onDelete: () -> Unit,
    onUsernameClick: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Row(
        modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    profile?.username ?: "...",
                    style = Theme.dmSans(12f, FontWeight.SemiBold),
                    color = Theme.textPrimary,
                    modifier = if (onUsernameClick != null && profile?.username != null) {
                        Modifier.clickable { onUsernameClick(profile.username) }
                    } else {
                        Modifier
                    }
                )
                if (profile?.isPlus == true) {
                    Spacer(Modifier.width(4.dp))
                    PlusBadge()
                }
            }
            Text(
                comment.content,
                style = Theme.dmSans(13f),
                color = Theme.textPrimary,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
        Row {
            onReply?.let {
                IconButton(onClick = it, Modifier.size(28.dp)) {
                    Icon(
                        Icons.Default.Reply,
                        "Reply",
                        tint = Theme.textMuted,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
            if (isOwn) {
                IconButton(onClick = onDelete, Modifier.size(28.dp)) {
                    Icon(
                        Icons.Default.Delete,
                        "Delete",
                        tint = Theme.textMuted,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }
    }
}
