package com.earwyrm.app.feature.explore

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric

/**
 * Displays the top 3 most-saved lyric clusters (grouped by canonical_lyric_id).
 */
@Composable
fun MostSavedSection(
    lyrics: List<Lyric>,
    onLyricClick: (Lyric) -> Unit = {},
    onArtistClick: (String) -> Unit = {},
    onSongClick: (String, String?) -> Unit = { _, _ -> }
) {
    // Group by canonicalLyricId; lyrics without one form their own group
    val groups = lyrics.groupBy { it.canonicalLyricId ?: it.id }

    // For each group: pick the representative (highest reactionCount), saveCount = group size
    data class Cluster(val representative: Lyric, val saveCount: Int)

    val clusters = groups.values
        .map { group ->
            Cluster(
                representative = group.maxByOrNull { it.reactionCount ?: 0 } ?: group.first(),
                saveCount = group.size
            )
        }
        .sortedByDescending { it.saveCount }
        .take(3)

    if (clusters.isEmpty()) return

    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        val headerText = if (clusters.size == 1) "most saved line" else "most saved lines"
        Text(
            text = headerText,
            style = Theme.caveat(20f, FontWeight.SemiBold),
            color = Theme.textSecondary,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        clusters.forEach { cluster ->
            ClusteredLyricCard(
                lyric = cluster.representative,
                username = "",
                saveCount = cluster.saveCount,
                reactionCount = cluster.representative.reactionCount ?: 0,
                commentCount = cluster.representative.commentCount ?: 0,
                onArtistClick = {
                    cluster.representative.artistName?.let { onArtistClick(it) }
                },
                onSongClick = {
                    cluster.representative.songTitle?.let { title ->
                        onSongClick(title, cluster.representative.artistName)
                    }
                },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )
        }
    }
}
