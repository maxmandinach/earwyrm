package com.earwyrm.app.core.auth

import com.earwyrm.app.core.model.Profile
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.SessionStatus
import io.github.jan.supabase.gotrue.user.UserSession
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthManager @Inject constructor(
    private val supabase: SupabaseClient
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _session = MutableStateFlow<UserSession?>(null)
    val session: StateFlow<UserSession?> = _session.asStateFlow()

    private val _profile = MutableStateFlow<Profile?>(null)
    val profile: StateFlow<Profile?> = _profile.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val isAuthenticated: Boolean get() = _session.value != null
    val userId: String? get() = _session.value?.user?.id

    init {
        observeAuthState()
    }

    private fun observeAuthState() {
        scope.launch {
            supabase.auth.sessionStatus.collect { status ->
                when (status) {
                    is SessionStatus.Authenticated -> {
                        _session.value = status.session
                        fetchProfile()
                        _isLoading.value = false
                    }
                    is SessionStatus.NotAuthenticated -> {
                        _session.value = null
                        _profile.value = null
                        _isLoading.value = false
                    }
                    is SessionStatus.LoadingFromStorage -> {
                        _isLoading.value = true
                    }
                    is SessionStatus.NetworkError -> {
                        _isLoading.value = false
                    }
                }
            }
        }
    }

    suspend fun signIn(email: String, password: String) {
        _error.value = null
        try {
            supabase.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
        } catch (e: Exception) {
            _error.value = parseAuthError(e, "Sign in failed")
            throw e
        }
    }

    suspend fun signUp(email: String, password: String, username: String) {
        _error.value = null
        val usernameRegex = Regex("^[a-zA-Z0-9_]{3,20}$")
        if (!usernameRegex.matches(username)) {
            _error.value = "Username must be 3-20 characters (letters, numbers, underscores)"
            throw IllegalArgumentException(_error.value)
        }
        try {
            supabase.auth.signUpWith(Email) {
                this.email = email
                this.password = password
                this.data = buildJsonObject {
                    put("username", username.lowercase())
                }
            }
        } catch (e: Exception) {
            _error.value = parseAuthError(e, "Sign up failed")
            throw e
        }
    }

    private fun parseAuthError(e: Exception, fallback: String): String {
        val msg = e.message ?: return fallback
        return when {
            "Invalid login credentials" in msg -> "Invalid email or password"
            "User already registered" in msg -> "An account with this email already exists"
            "Email not confirmed" in msg -> "Please check your email to confirm your account"
            "Password should be" in msg -> msg.substringAfter("Password should be").let { "Password should be$it" }
            "Unable to validate" in msg -> "Invalid email address"
            else -> msg.substringBefore(" URL:").substringBefore(" Http").trim().ifEmpty { fallback }
        }
    }

    suspend fun signOut() {
        try {
            supabase.auth.signOut()
        } catch (e: Exception) {
            _error.value = e.message
        }
    }

    suspend fun fetchProfile() {
        val uid = userId ?: return
        try {
            val result = supabase.postgrest.from("profiles")
                .select { filter { eq("id", uid) } }
                .decodeSingle<Profile>()
            _profile.value = result
        } catch (_: Exception) { }
    }

    suspend fun checkEmailExists(email: String): Boolean {
        return try {
            val result = supabase.postgrest.rpc(
                "check_email_exists",
                buildJsonObject { put("email_input", email.trim().lowercase()) }
            )
            result.decodeAs<Boolean>()
        } catch (_: Exception) {
            false
        }
    }

    fun clearError() {
        _error.value = null
    }
}
