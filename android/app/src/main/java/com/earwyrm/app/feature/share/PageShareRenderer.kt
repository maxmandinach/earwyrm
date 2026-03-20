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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Renders page share card bitmaps (artist/song pages) using Android Canvas/Paint API.
 * Warm taupe gradient background, large Caveat title, stats line, earwyrm watermark.
 */
object PageShareRenderer {

    private const val WIDTH = 1080
    private const val HEIGHT = 1350
    private const val CORNER_RADIUS = 48f
    private const val MARGIN_X = 120f
    private const val BORDER_WIDTH = 2f

    // Theme colors matching ShareImageRenderer
    private val COLOR_BG_TOP = 0xFFF5F2ED.toInt()
    private val COLOR_BG_BOTTOM = 0xFFEDE8E1.toInt()
    private val COLOR_TEXT = 0xFF2C2825.toInt()
    private val COLOR_SECONDARY = 0xFF6B635A.toInt()
    private val COLOR_ACCENT = 0xFFB8A99A.toInt()
    private val COLOR_BORDER = 0xFFD4CFC4.toInt()

    suspend fun renderPageShareCard(
        context: Context,
        pageType: String,
        title: String,
        subtitle: String? = null,
        statsLine: String? = null
    ): Bitmap = withContext(Dispatchers.Default) {
        val bitmap = Bitmap.createBitmap(WIDTH, HEIGHT, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val caveatSemiBold = loadTypeface(context, R.font.caveat_semibold)
        val caveatBold = loadTypeface(context, R.font.caveat_bold)
        val dmSansMedium = loadTypeface(context, R.font.dm_sans_medium)

        // 1. Draw gradient background
        drawGradientBackground(canvas)

        // 2. Draw border
        drawBorder(canvas)

        // 3. Draw page type label at top
        drawPageTypeLabel(canvas, pageType, dmSansMedium)

        // 4. Draw large title (artist name or song title)
        val titleBottomY = drawTitle(canvas, title, caveatBold)

        // 5. Draw subtitle if present (artist name for song pages)
        var currentY = titleBottomY
        if (subtitle != null) {
            currentY = drawSubtitle(canvas, subtitle, dmSansMedium, currentY + 24f)
        }

        // 6. Draw stats line if present
        if (statsLine != null) {
            drawStatsLine(canvas, statsLine, dmSansMedium, currentY + 40f)
        }

        // 7. Draw accent rule
        drawAccentRule(canvas, currentY + 100f)

        // 8. Draw footer (earwyrm watermark)
        drawFooter(canvas, caveatSemiBold, dmSansMedium)

        bitmap
    }

    private fun drawGradientBackground(canvas: Canvas) {
        val gradient = LinearGradient(
            0f, 0f, 0f, HEIGHT.toFloat(),
            COLOR_BG_TOP, COLOR_BG_BOTTOM,
            Shader.TileMode.CLAMP
        )
        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = gradient
            style = Paint.Style.FILL
        }
        val rect = RectF(0f, 0f, WIDTH.toFloat(), HEIGHT.toFloat())
        canvas.drawRoundRect(rect, CORNER_RADIUS, CORNER_RADIUS, bgPaint)
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

    private fun drawPageTypeLabel(canvas: Canvas, pageType: String, typeface: Typeface) {
        val label = when (pageType) {
            "artist" -> "ARTIST"
            "song" -> "SONG"
            else -> pageType.uppercase()
        }

        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_ACCENT
            textSize = 28f
            this.typeface = typeface
            letterSpacing = 0.15f
        }

        canvas.drawText(label, MARGIN_X, 160f, paint)
    }

    private fun drawTitle(canvas: Canvas, title: String, typeface: Typeface): Float {
        val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_TEXT
            this.typeface = typeface
        }

        val maxWidth = (WIDTH - MARGIN_X * 2).toInt()

        // Dynamic font sizing based on title length
        val charCount = title.length
        val fontSize = when {
            charCount > 60 -> 72f
            charCount > 40 -> 84f
            charCount > 20 -> 100f
            else -> 120f
        }
        textPaint.textSize = fontSize
        val lineSpacing = fontSize * 0.3f

        val layout = StaticLayout.Builder.obtain(title, 0, title.length, textPaint, maxWidth)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setLineSpacing(lineSpacing, 1f)
            .setIncludePad(false)
            .build()

        // Position title in the upper-center area of the card
        val availableHeight = HEIGHT * 0.6f
        val textHeight = layout.height.toFloat()
        val topY = ((availableHeight - textHeight) / 2f).coerceAtLeast(220f)

        canvas.save()
        canvas.translate(MARGIN_X, topY)
        layout.draw(canvas)
        canvas.restore()

        return topY + textHeight
    }

    private fun drawSubtitle(canvas: Canvas, subtitle: String, typeface: Typeface, y: Float): Float {
        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_SECONDARY
            textSize = 40f
            this.typeface = typeface
        }

        val maxWidth = (WIDTH - MARGIN_X * 2).toInt()
        val layout = StaticLayout.Builder.obtain(subtitle, 0, subtitle.length, paint, maxWidth)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setLineSpacing(0f, 1f)
            .setMaxLines(2)
            .setIncludePad(false)
            .build()

        canvas.save()
        canvas.translate(MARGIN_X, y)
        layout.draw(canvas)
        canvas.restore()

        return y + layout.height.toFloat()
    }

    private fun drawStatsLine(canvas: Canvas, statsLine: String, typeface: Typeface, y: Float) {
        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_SECONDARY
            alpha = 180
            textSize = 32f
            this.typeface = typeface
        }

        canvas.drawText(statsLine, MARGIN_X, y, paint)
    }

    private fun drawAccentRule(canvas: Canvas, y: Float) {
        val rulePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_ACCENT
            alpha = 128
            style = Paint.Style.FILL
        }
        canvas.drawRect(MARGIN_X, y, MARGIN_X + 80f, y + 2f, rulePaint)
    }

    private fun drawFooter(canvas: Canvas, caveatSemiBold: Typeface, dmSansMedium: Typeface) {
        val bottomPad = 56f
        var currentY = HEIGHT - bottomPad

        // Brand: "earwyrm" in Caveat semibold
        val brandPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_SECONDARY
            alpha = 166
            textSize = 56f
            typeface = caveatSemiBold
        }
        val brandMetrics = brandPaint.fontMetrics
        val brandHeight = brandMetrics.descent - brandMetrics.ascent
        currentY -= brandHeight
        canvas.drawText("earwyrm", MARGIN_X, currentY - brandMetrics.ascent, brandPaint)

        // "on earwyrm" subtitle above brand
        currentY -= 16f
        val subtitlePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = COLOR_SECONDARY
            alpha = 102
            textSize = 28f
            typeface = dmSansMedium
        }
        val subMetrics = subtitlePaint.fontMetrics
        val subHeight = subMetrics.descent - subMetrics.ascent
        currentY -= subHeight
        canvas.drawText("on earwyrm", MARGIN_X, currentY - subMetrics.ascent, subtitlePaint)
    }

    private fun loadTypeface(context: Context, fontRes: Int): Typeface {
        return try {
            context.resources.getFont(fontRes)
        } catch (_: Exception) {
            Typeface.DEFAULT
        }
    }
}
