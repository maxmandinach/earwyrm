package com.earwyrm.app.feature.share

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import com.earwyrm.app.R
import com.earwyrm.app.core.model.Lyric
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Renders share card bitmaps using Android Canvas/Paint API.
 * Matches the iOS ShareImageView design language: warm taupe palette,
 * Caveat for lyrics, DM Sans for attribution, earwyrm branding.
 */
object ShareImageRenderer {

    private const val WIDTH = 1080
    private const val HEIGHT = 1350
    private const val CORNER_RADIUS = 48f
    private const val MARGIN_X = 120f
    private const val BORDER_WIDTH = 2f
    private const val RULE_WIDTH = 80f
    private const val RULE_HEIGHT = 2f

    // Theme colors (light theme — matches iOS ShareTheme.light)
    private val COLOR_BG = 0xFFF5F2ED.toInt()
    private val COLOR_TEXT = 0xFF2C2825.toInt()
    private val COLOR_SECONDARY = 0xFF6B635A.toInt()
    private val COLOR_ACCENT = 0xFFB8A99A.toInt()
    private val COLOR_BORDER = 0xFFD4CFC4.toInt()

    suspend fun renderShareCard(
        context: Context,
        lyric: Lyric,
        username: String? = null,
        cardArtBitmap: Bitmap? = null,
        noteContent: String? = null
    ): Bitmap = withContext(Dispatchers.Default) {
        val bitmap = Bitmap.createBitmap(WIDTH, HEIGHT, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val caveatTypeface = loadTypeface(context, R.font.caveat_medium)
        val caveatSemiBold = loadTypeface(context, R.font.caveat_semibold)
        val dmSansItalic = loadTypeface(context, R.font.dm_sans_italic)
        val dmSansMedium = loadTypeface(context, R.font.dm_sans_medium)

        // 1. Draw background
        drawBackground(canvas, cardArtBitmap)

        // 2. Draw border
        drawBorder(canvas)

        // 3. Draw lyric text — returns the Y position after the last line
        val lyricBottomY = drawLyricText(canvas, lyric.content, caveatTypeface)

        // 4. Draw note (if present) — returns Y after note block, or lyricBottomY if no note
        val afterNoteY = if (!noteContent.isNullOrBlank()) {
            drawNote(canvas, noteContent, dmSansItalic, dmSansMedium, lyricBottomY + 24f)
        } else {
            lyricBottomY
        }

        // 5. Draw rule (accent divider line)
        val ruleY = afterNoteY + 32f
        drawRule(canvas, ruleY)

        // 6. Draw song attribution (title — artist)
        val attrY = ruleY + 40f
        drawAttribution(canvas, lyric.songTitle, lyric.artistName, dmSansItalic, attrY)

        // 7. Draw footer (username + earwyrm brand)
        drawFooter(canvas, username, caveatSemiBold, dmSansMedium)

        bitmap
    }

    private fun drawBackground(canvas: Canvas, cardArtBitmap: Bitmap?) {
        // Solid background
        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_BG
            style = Paint.Style.FILL
        }
        val rect = RectF(0f, 0f, WIDTH.toFloat(), HEIGHT.toFloat())
        canvas.drawRoundRect(rect, CORNER_RADIUS, CORNER_RADIUS, bgPaint)

        // If card art provided, draw it at low opacity with gradient overlay
        if (cardArtBitmap != null) {
            val scaled = Bitmap.createScaledBitmap(cardArtBitmap, WIDTH, HEIGHT, true)

            // Clip to rounded rect
            canvas.save()
            val clipPath = Path().apply {
                addRoundRect(rect, CORNER_RADIUS, CORNER_RADIUS, Path.Direction.CW)
            }
            canvas.clipPath(clipPath)

            // Draw art at low opacity
            val artPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                alpha = 20 // ~8% opacity, matches iOS coverArt style
            }
            canvas.drawBitmap(scaled, 0f, 0f, artPaint)

            // Gradient overlay for text legibility: solid bg color at top/bottom, transparent in middle
            val gradientPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                shader = LinearGradient(
                    0f, 0f, 0f, HEIGHT.toFloat(),
                    intArrayOf(
                        COLOR_BG and 0x00FFFFFF or (0xCC shl 24),  // ~80% opacity at top
                        COLOR_BG and 0x00FFFFFF or (0x33 shl 24),  // ~20% opacity at 1/3
                        COLOR_BG and 0x00FFFFFF or (0x33 shl 24),  // ~20% opacity at 2/3
                        COLOR_BG and 0x00FFFFFF or (0xCC shl 24)   // ~80% opacity at bottom
                    ),
                    floatArrayOf(0f, 0.3f, 0.7f, 1f),
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRect(rect, gradientPaint)

            canvas.restore()

            if (scaled !== cardArtBitmap) scaled.recycle()
        }
    }

    private fun drawBorder(canvas: Canvas) {
        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_BORDER
            style = Paint.Style.STROKE
            strokeWidth = BORDER_WIDTH
        }
        val inset = BORDER_WIDTH / 2f
        val borderRect = RectF(inset, inset, WIDTH - inset, HEIGHT - inset)
        canvas.drawRoundRect(borderRect, CORNER_RADIUS, CORNER_RADIUS, borderPaint)
    }

    private fun drawLyricText(canvas: Canvas, content: String, typeface: Typeface): Float {
        val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_TEXT
            this.typeface = typeface
        }

        val maxWidth = (WIDTH - MARGIN_X * 2).toInt()

        // Dynamic font sizing — fit long lyrics, let short ones breathe
        val charCount = content.length
        val fontSize = when {
            charCount > 400 -> 52f
            charCount > 250 -> 60f
            charCount > 150 -> 72f
            charCount > 80 -> 84f
            else -> 96f
        }
        textPaint.textSize = fontSize
        val lineSpacing = fontSize * 0.4f

        val layout = StaticLayout.Builder.obtain(content, 0, content.length, textPaint, maxWidth)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setLineSpacing(lineSpacing, 1f)
            .setIncludePad(false)
            .build()

        // Vertically center the lyric block in the upper portion of the card
        // Reserve ~300px at the bottom for attribution + footer
        val availableHeight = HEIGHT - 300f
        val textHeight = layout.height.toFloat()
        val topY = ((availableHeight - textHeight) / 2f).coerceAtLeast(120f)

        canvas.save()
        canvas.translate(MARGIN_X, topY)
        layout.draw(canvas)
        canvas.restore()

        return topY + textHeight
    }

    /**
     * Draws the note section: "my note" label, accent bar, and note text.
     * Returns the Y position after the note block.
     */
    private fun drawNote(
        canvas: Canvas,
        noteContent: String,
        dmSansItalic: Typeface,
        dmSansMedium: Typeface,
        startY: Float
    ): Float {
        var currentY = startY
        val maxWidth = (WIDTH - MARGIN_X * 2 - 20f).toInt() // Extra indent for accent bar

        // "my note" label
        val labelPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_ACCENT
            textSize = 24f
            typeface = dmSansItalic
        }
        val labelMetrics = labelPaint.fontMetrics
        currentY -= labelMetrics.ascent // baseline offset
        canvas.drawText("my note", MARGIN_X + 16f, currentY, labelPaint)
        currentY += labelMetrics.descent + 12f

        // Note text
        val notePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_SECONDARY
            textSize = 28f
            typeface = dmSansItalic
        }
        val noteLayout = StaticLayout.Builder.obtain(noteContent, 0, noteContent.length, notePaint, maxWidth)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setLineSpacing(4f, 1f)
            .setIncludePad(false)
            .build()

        // Accent bar on the left
        val barTop = currentY
        val barBottom = currentY + noteLayout.height.toFloat()
        val barPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_ACCENT
            style = Paint.Style.FILL
        }
        canvas.drawRect(MARGIN_X, barTop, MARGIN_X + 3f, barBottom, barPaint)

        // Draw note text (indented past the bar)
        canvas.save()
        canvas.translate(MARGIN_X + 16f, currentY)
        noteLayout.draw(canvas)
        canvas.restore()

        return currentY + noteLayout.height.toFloat()
    }

    private fun drawRule(canvas: Canvas, y: Float) {
        val rulePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_ACCENT
            alpha = 128 // 50% opacity
            style = Paint.Style.FILL
        }
        canvas.drawRect(MARGIN_X, y, MARGIN_X + RULE_WIDTH, y + RULE_HEIGHT, rulePaint)
    }

    private fun drawAttribution(
        canvas: Canvas,
        songTitle: String?,
        artistName: String?,
        typeface: Typeface,
        y: Float
    ) {
        if (songTitle == null && artistName == null) return

        val parts = listOfNotNull(songTitle, artistName)
        val text = parts.joinToString(" \u2014 ") // em dash

        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_SECONDARY
            textSize = 32f
            this.typeface = typeface
        }

        val maxWidth = (WIDTH - MARGIN_X * 2).toInt()
        val layout = StaticLayout.Builder.obtain(text, 0, text.length, paint, maxWidth)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setLineSpacing(0f, 1f)
            .setMaxLines(2)
            .setIncludePad(false)
            .build()

        canvas.save()
        canvas.translate(MARGIN_X, y)
        layout.draw(canvas)
        canvas.restore()
    }

    private fun drawFooter(
        canvas: Canvas,
        username: String?,
        caveatSemiBold: Typeface,
        dmSansMedium: Typeface
    ) {
        val bottomPad = 56f
        var currentY = HEIGHT - bottomPad

        // Brand: "earwyrm" in Caveat semibold
        val brandPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_SECONDARY
            alpha = 166 // ~65% opacity matches iOS light theme brandOpacity
            textSize = 56f
            typeface = caveatSemiBold
        }
        val brandMetrics = brandPaint.fontMetrics
        val brandHeight = brandMetrics.descent - brandMetrics.ascent
        currentY -= brandHeight
        canvas.drawText("earwyrm", MARGIN_X, currentY - brandMetrics.ascent, brandPaint)

        // Username above brand
        if (username != null) {
            currentY -= 16f // gap between username and brand

            val userPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
                color = COLOR_SECONDARY
                alpha = 102 // ~40% opacity matches iOS light theme usernameOpacity
                textSize = 28f
                typeface = dmSansMedium
            }
            val userMetrics = userPaint.fontMetrics
            val userHeight = userMetrics.descent - userMetrics.ascent
            currentY -= userHeight
            canvas.drawText("@$username", MARGIN_X, currentY - userMetrics.ascent, userPaint)
        }
    }

    private fun loadTypeface(context: Context, fontRes: Int): Typeface {
        return try {
            context.resources.getFont(fontRes)
        } catch (_: Exception) {
            Typeface.DEFAULT
        }
    }
}
