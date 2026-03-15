package com.earwyrm.app.feature.auth

import androidx.lifecycle.ViewModel
import com.earwyrm.app.core.auth.AuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(private val authManager: AuthManager) : ViewModel() {
    val error = authManager.error
    private val _isSubmitting = MutableStateFlow(false)
    val isSubmitting: StateFlow<Boolean> = _isSubmitting.asStateFlow()

    suspend fun checkEmail(email: String, onResult: (Boolean) -> Unit) {
        _isSubmitting.value = true
        authManager.clearError()
        try {
            val exists = authManager.checkEmailExists(email)
            onResult(exists)
        } catch (_: Exception) {
            onResult(false)
        } finally {
            _isSubmitting.value = false
        }
    }

    suspend fun signIn(email: String, password: String) {
        _isSubmitting.value = true
        try {
            authManager.signIn(email.trim(), password)
        } catch (_: Exception) {
        } finally {
            _isSubmitting.value = false
        }
    }

    suspend fun signUp(email: String, password: String, username: String, onSuccess: () -> Unit = {}) {
        _isSubmitting.value = true
        try {
            authManager.signUp(email.trim(), password, username.trim())
            onSuccess()
        } catch (_: Exception) {
        } finally {
            _isSubmitting.value = false
        }
    }

    fun clearError() {
        authManager.clearError()
    }
}
