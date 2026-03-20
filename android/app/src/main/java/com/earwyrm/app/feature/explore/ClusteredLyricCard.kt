package com.earwyrm.app.feature.explore

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric

@Composable
fun ClusteredLyricCard(
    lyric: Lyric,
    username: String,
    isPlus: Boolean = false,
    saveCount: Int = 1,
    hasReacted: Boolean = false,
    reactionCount: Int = 0,
    commentCount: Int = 0,
    isSaved: Boolean = false,
    onResonate: () -> Unit = {},
    onSave: () -> Unit = {},
    onShare: () -> Unit = {},
    onArtistClick: () -> Unit = {},
    onSongClick: () -> Unit = {},
    onUserClick: () -> Unit = {},
    onCommentClick: () -> Unit = {},
    onReportClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        CompactLyricCard(
            lyric = lyric,
            username = username,
            isPlus = isPlus,
            hasReacted = hasReacted,
            reactionCount = reactionCount,
            commentCount = commentCount,
            isSaved = isSaved,
            onResonate = onResonate,
            onSave = onSave,
            onShare = onShare,
            onArtistClick = onArtistClick,
            onSongClick = onSongClick,
            onUserClick = onUserClick,
            onCommentClick = onCommentClick,
            onReportClick = onReportClick
        )
        if (saveCount > 1) {
            Text(
                text = "$saveCount people saved this",
                style = Theme.dmSans(12f),
                color = Theme.textMuted,
                modifier = Modifier.padding(start = 14.dp, top = 4.dp)
            )
        }
    }
}
