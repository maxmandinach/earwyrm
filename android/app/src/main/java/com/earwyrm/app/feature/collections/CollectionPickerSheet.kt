package com.earwyrm.app.feature.collections

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.CollectionInsert
import com.earwyrm.app.core.model.EarwyrmCollection
import com.earwyrm.app.core.supabase.CollectionManager
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CollectionPickerSheet(
    lyricId: String,
    userId: String,
    collectionManager: CollectionManager,
    onDismiss: () -> Unit,
    onSaved: () -> Unit = {}
) {
    val collections by collectionManager.collections.collectAsState()
    val savedIds by collectionManager.savedLyricIds.collectAsState()
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Theme.card
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            Text(
                "Save to Collection",
                style = Theme.dmSans(18f, FontWeight.SemiBold),
                color = Theme.textPrimary
            )
            Spacer(Modifier.height(12.dp))

            if (collections.isEmpty()) {
                Text(
                    "No collections yet",
                    style = Theme.dmSans(14f),
                    color = Theme.textMuted,
                    modifier = Modifier.padding(vertical = 16.dp)
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    items(collections.filter { it.isSmart != true }, key = { it.id }) { collection ->
                        CollectionRow(
                            collection = collection,
                            isSaved = lyricId in (savedIds),
                            onClick = {
                                scope.launch {
                                    collectionManager.addLyricToCollection(lyricId, collection.id)
                                    onSaved()
                                    onDismiss()
                                }
                            }
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            TextButton(onClick = {
                scope.launch {
                    collectionManager.createCollection(
                        CollectionInsert(userId = userId, name = "My Keepsakes")
                    )
                }
            }) {
                Icon(Icons.Default.Add, contentDescription = null, tint = Theme.accent)
                Spacer(Modifier.width(4.dp))
                Text("New Collection", style = Theme.dmSans(14f), color = Theme.accent)
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun CollectionRow(
    collection: EarwyrmCollection,
    isSaved: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(8.dp),
        color = Theme.background
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(collection.name, style = Theme.dmSans(15f, FontWeight.Medium), color = Theme.textPrimary)
                if (collection.description != null) {
                    Text(collection.description, style = Theme.dmSans(12f), color = Theme.textSecondary)
                }
            }
            if (isSaved) {
                Icon(Icons.Default.Check, "Saved", tint = Theme.accent)
            }
        }
    }
}
