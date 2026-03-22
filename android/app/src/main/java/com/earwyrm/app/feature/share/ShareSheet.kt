package com.earwyrm.app.feature.share

import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import coil.imageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareSheet(
    lyric: Lyric,
    noteContent: String? = null,
    username: String? = null,
    onDismiss: () -> Unit,
    onShared: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState()
    var isSharing by remember { mutableStateOf(false) }
    var copyButtonText by remember { mutableStateOf("Copy Link") }
    var saveButtonText by remember { mutableStateOf("Save to Photos") }

    // Render the preview image once when the sheet opens
    var previewBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var isRendering by remember { mutableStateOf(true) }

    LaunchedEffect(lyric.id) {
        isRendering = true
        // Load card art bitmap if available
        val cardArtBitmap = lyric.cardArtUrl?.let { url ->
            loadBitmapFromUrl(context, url)
        }
        previewBitmap = ShareImageRenderer.renderShareCard(
            context = context,
            lyric = lyric,
            username = username,
            cardArtBitmap = cardArtBitmap,
            noteContent = noteContent
        )
        isRendering = false
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Theme.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Share",
                style = Theme.dmSans(18f, FontWeight.SemiBold),
                color = Theme.textPrimary
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Image preview
            if (isRendering) {
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(40.dp)
                        .padding(vertical = 8.dp),
                    color = Theme.accent,
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.height(16.dp))
            } else if (previewBitmap != null) {
                Image(
                    bitmap = previewBitmap!!.asImageBitmap(),
                    contentDescription = "Share card preview",
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp),
                    contentScale = ContentScale.Fit
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Share Image button
            Button(
                onClick = {
                    if (!isSharing) {
                        isSharing = true
                        scope.launch {
                            val bitmap = previewBitmap ?: return@launch
                            shareImageIntent(context, bitmap)
                            isSharing = false
                            onShared()
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
                enabled = !isSharing && !isRendering
            ) {
                if (isSharing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Share Image", style = Theme.dmSans(15f, FontWeight.SemiBold))
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Copy Link button
            OutlinedButton(
                onClick = {
                    val url = "https://earwyrm.app/s/${lyric.shareToken}"
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("earwyrm link", url))
                    copyButtonText = "Copied!"
                    scope.launch {
                        delay(2000)
                        copyButtonText = "Copy Link"
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Theme.accent
                )
            ) {
                Text(copyButtonText, style = Theme.dmSans(15f, FontWeight.SemiBold))
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Save to Photos button
            OutlinedButton(
                onClick = {
                    val bitmap = previewBitmap ?: return@OutlinedButton
                    scope.launch {
                        saveToGallery(context, bitmap)
                        saveButtonText = "Saved!"
                        delay(2000)
                        saveButtonText = "Save to Photos"
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Theme.accent
                ),
                enabled = !isRendering
            ) {
                Text(saveButtonText, style = Theme.dmSans(15f, FontWeight.SemiBold))
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Share Link (text-only secondary button)
            TextButton(
                onClick = {
                    val url = "https://earwyrm.app/s/${lyric.shareToken}"
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, url)
                    }
                    context.startActivity(Intent.createChooser(intent, "Share earwyrm"))
                    onShared()
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "Share Link",
                    style = Theme.dmSans(15f, FontWeight.Medium),
                    color = Theme.textSecondary
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

/**
 * Loads a bitmap from a URL using Coil.
 */
private suspend fun loadBitmapFromUrl(context: Context, url: String): Bitmap? {
    return try {
        val request = ImageRequest.Builder(context)
            .data(url)
            .allowHardware(false)
            .build()
        val result = context.imageLoader.execute(request)
        if (result is SuccessResult) {
            (result.drawable as? android.graphics.drawable.BitmapDrawable)?.bitmap
        } else null
    } catch (_: Exception) {
        null
    }
}

/**
 * Shares a bitmap via Android share sheet intent.
 */
private suspend fun shareImageIntent(context: Context, bitmap: Bitmap) {
    withContext(Dispatchers.IO) {
        val file = File(context.cacheDir, "earwyrm_share.png")
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

/**
 * Saves a bitmap to the device gallery via MediaStore.
 */
private suspend fun saveToGallery(context: Context, bitmap: Bitmap) {
    withContext(Dispatchers.IO) {
        val filename = "earwyrm_${System.currentTimeMillis()}.png"
        val contentValues = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, filename)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Earwyrm")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        }

        val resolver = context.contentResolver
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)

        uri?.let {
            resolver.openOutputStream(it)?.use { stream ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                contentValues.clear()
                contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                resolver.update(it, contentValues, null, null)
            }
        }
    }
}
