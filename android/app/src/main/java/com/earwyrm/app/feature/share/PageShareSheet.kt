package com.earwyrm.app.feature.share

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.earwyrm.app.core.design.Theme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.net.URLEncoder

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PageShareSheet(
    pageType: String,
    title: String,
    subtitle: String? = null,
    statsLine: String? = null,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState()
    var isRendering by remember { mutableStateOf(false) }

    val shareUrl = buildPageShareUrl(pageType, title, subtitle)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Theme.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            Text(
                text = "Share",
                style = Theme.dmSans(18f, FontWeight.SemiBold),
                color = Theme.textPrimary
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Link preview
            Text(
                text = shareUrl,
                style = Theme.dmSans(12f),
                color = Theme.textMuted,
                maxLines = 1
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Share as image
            Button(
                onClick = {
                    if (!isRendering) {
                        isRendering = true
                        scope.launch {
                            sharePageAsImage(
                                context = context,
                                pageType = pageType,
                                title = title,
                                subtitle = subtitle,
                                statsLine = statsLine
                            )
                            isRendering = false
                            onDismiss()
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Theme.accent,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                enabled = !isRendering
            ) {
                if (isRendering) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Share as Image", style = Theme.dmSans(15f, FontWeight.SemiBold))
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Share link
            TextButton(
                onClick = {
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, shareUrl)
                    }
                    context.startActivity(Intent.createChooser(intent, "Share earwyrm"))
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "Share Link",
                    style = Theme.dmSans(15f, FontWeight.Medium),
                    color = Theme.accent
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

private fun buildPageShareUrl(pageType: String, title: String, subtitle: String?): String {
    val encodedTitle = URLEncoder.encode(title, "UTF-8")
    return when (pageType) {
        "artist" -> "https://earwyrm.app/artist/$encodedTitle"
        "song" -> {
            val encodedArtist = subtitle?.let { URLEncoder.encode(it, "UTF-8") }
            if (encodedArtist != null) {
                "https://earwyrm.app/song/$encodedTitle/$encodedArtist"
            } else {
                "https://earwyrm.app/song/$encodedTitle"
            }
        }
        else -> "https://earwyrm.app"
    }
}

private suspend fun sharePageAsImage(
    context: Context,
    pageType: String,
    title: String,
    subtitle: String?,
    statsLine: String?
) {
    val bitmap = PageShareRenderer.renderPageShareCard(
        context = context,
        pageType = pageType,
        title = title,
        subtitle = subtitle,
        statsLine = statsLine
    )

    withContext(Dispatchers.IO) {
        val file = File(context.cacheDir, "earwyrm_page_share.png")
        file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }

        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )

        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        withContext(Dispatchers.Main) {
            context.startActivity(Intent.createChooser(intent, "Share earwyrm"))
        }
    }
}
