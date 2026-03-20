package com.earwyrm.app.feature.share

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.supabase.BlockManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val reportReasons = listOf(
    "Spam",
    "Harassment",
    "Inappropriate content",
    "Copyright violation",
    "Other"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportSheet(
    contentType: String,
    contentId: String,
    reporterId: String,
    blockManager: BlockManager,
    onDismiss: () -> Unit
) {
    var selectedReason by remember { mutableStateOf<String?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }
    var submitted by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Auto-dismiss after submission
    LaunchedEffect(submitted) {
        if (submitted) {
            delay(1200)
            onDismiss()
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Theme.card
    ) {
        AnimatedContent(
            targetState = submitted,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "report_state"
        ) { isSubmitted ->
            if (isSubmitted) {
                // Confirmation state
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = Color(0xFF4CAF50),
                        modifier = Modifier.size(40.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Report submitted",
                        style = Theme.dmSans(16f, FontWeight.Medium),
                        color = Theme.textPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Thanks for helping keep Earwyrm safe.",
                        style = Theme.dmSans(14f),
                        color = Theme.textSecondary
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                }
            } else {
                // Reason selection state
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Header
                    Icon(
                        imageVector = Icons.Outlined.Flag,
                        contentDescription = null,
                        tint = Theme.textSecondary,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Report $contentType",
                        style = Theme.dmSans(18f, FontWeight.Medium),
                        color = Theme.textPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Why are you reporting this?",
                        style = Theme.dmSans(14f),
                        color = Theme.textMuted
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    // Reason options
                    reportReasons.forEach { reason ->
                        val isSelected = selectedReason == reason
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (isSelected) Theme.accent.copy(alpha = 0.08f)
                                    else Theme.background
                                )
                                .clickable { selectedReason = reason }
                                .padding(horizontal = 16.dp, vertical = 14.dp)
                        ) {
                            Text(
                                text = reason,
                                style = Theme.dmSans(15f),
                                color = Theme.textPrimary,
                                modifier = Modifier.weight(1f)
                            )
                            if (isSelected) {
                                Icon(
                                    imageVector = Icons.Filled.CheckCircle,
                                    contentDescription = "Selected",
                                    tint = Theme.accent,
                                    modifier = Modifier.size(20.dp)
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(20.dp)
                                        .clip(CircleShape)
                                        .background(Color.Transparent)
                                        .then(
                                            Modifier.background(
                                                color = Color.Transparent,
                                                shape = CircleShape
                                            )
                                        )
                                ) {
                                    // Empty circle outline
                                    Box(
                                        modifier = Modifier
                                            .size(20.dp)
                                            .clip(CircleShape)
                                            .background(Theme.textMuted.copy(alpha = 0.15f))
                                            .padding(1.5.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(17.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    if (isSelected) Theme.accent
                                                    else Theme.card
                                                )
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Submit button
                    Button(
                        onClick = {
                            if (selectedReason == null || isSubmitting) return@Button
                            isSubmitting = true
                            scope.launch {
                                blockManager.reportContent(
                                    reporterId = reporterId,
                                    contentType = contentType,
                                    contentId = contentId,
                                    reason = selectedReason!!
                                )
                                submitted = true
                                isSubmitting = false
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        enabled = selectedReason != null && !isSubmitting,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFD4756A),
                            contentColor = Color.White,
                            disabledContainerColor = Theme.textMuted.copy(alpha = 0.3f),
                            disabledContentColor = Color.White.copy(alpha = 0.5f)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Report", style = Theme.dmSans(16f, FontWeight.Medium))
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}
