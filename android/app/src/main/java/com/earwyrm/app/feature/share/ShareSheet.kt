package com.earwyrm.app.feature.share

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.earwyrm.app.core.design.EarwyrmColors
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.model.Lyric
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareSheet(
    lyric: Lyric,
    onDismiss: () -> Unit,
    onShared: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState()

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

            Spacer(modifier = Modifier.height(16.dp))

            // Share as image
            Button(
                onClick = {
                    scope.launch {
                        shareAsImage(context, lyric)
                        onShared()
                        onDismiss()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Theme.accent,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Share as Image", style = Theme.dmSans(15f, FontWeight.SemiBold))
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Share link
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
                    color = Theme.accent
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

private suspend fun shareAsImage(context: Context, lyric: Lyric) {
    withContext(Dispatchers.Default) {
        val width = 1080
        val height = 1350
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Background
        val bgPaint = Paint().apply {
            color = android.graphics.Color.parseColor("#FAF8F5")
            style = Paint.Style.FILL
        }
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), bgPaint)

        // Lyric text
        val lyricPaint = Paint().apply {
            color = android.graphics.Color.parseColor("#1A1A1A")
            textSize = 64f
            isAntiAlias = true
            try {
                typeface = Typeface.createFromAsset(context.assets, "caveat_medium.ttf")
            } catch (_: Exception) {
                typeface = Typeface.create(Typeface.SERIF, Typeface.NORMAL)
            }
        }

        // Draw lyric content with word wrapping
        val lines = wrapText(lyric.content, lyricPaint, (width - 160).toFloat())
        var y = height / 3f
        lines.forEach { line ->
            canvas.drawText(line, 80f, y, lyricPaint)
            y += 80f
        }

        // Song info
        if (lyric.songTitle != null) {
            val songPaint = Paint().apply {
                color = android.graphics.Color.parseColor("#6B6B6B")
                textSize = 36f
                isAntiAlias = true
            }
            canvas.drawText(
                "${lyric.songTitle}${if (lyric.artistName != null) " — ${lyric.artistName}" else ""}",
                80f, y + 60f, songPaint
            )
        }

        // Watermark
        val watermarkPaint = Paint().apply {
            color = android.graphics.Color.parseColor("#B8A99A")
            textSize = 28f
            isAntiAlias = true
        }
        canvas.drawText("earwyrm.app", 80f, height - 60f, watermarkPaint)

        // Save and share
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

private fun wrapText(text: String, paint: Paint, maxWidth: Float): List<String> {
    val words = text.split(" ")
    val lines = mutableListOf<String>()
    var currentLine = ""

    words.forEach { word ->
        val testLine = if (currentLine.isEmpty()) word else "$currentLine $word"
        if (paint.measureText(testLine) <= maxWidth) {
            currentLine = testLine
        } else {
            if (currentLine.isNotEmpty()) lines.add(currentLine)
            currentLine = word
        }
    }
    if (currentLine.isNotEmpty()) lines.add(currentLine)

    return lines
}
