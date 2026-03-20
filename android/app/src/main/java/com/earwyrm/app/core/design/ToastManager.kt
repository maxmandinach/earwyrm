package com.earwyrm.app.core.design

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

enum class ToastStyle { ERROR, SUCCESS }

data class ToastMessage(
    val id: String = UUID.randomUUID().toString(),
    val message: String,
    val style: ToastStyle = ToastStyle.ERROR
)

@Singleton
class ToastManager @Inject constructor() {
    private val _currentToast = MutableStateFlow<ToastMessage?>(null)
    val currentToast: StateFlow<ToastMessage?> = _currentToast.asStateFlow()
    private var dismissJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    fun show(message: String, style: ToastStyle = ToastStyle.ERROR) {
        dismissJob?.cancel()
        val toast = ToastMessage(message = message, style = style)
        _currentToast.value = toast
        dismissJob = scope.launch {
            delay(if (style == ToastStyle.ERROR) 2500L else 3500L)
            if (_currentToast.value?.id == toast.id) _currentToast.value = null
        }
    }

    fun dismiss() {
        dismissJob?.cancel()
        _currentToast.value = null
    }
}
