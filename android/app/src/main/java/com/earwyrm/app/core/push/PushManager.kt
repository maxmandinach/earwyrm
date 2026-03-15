package com.earwyrm.app.core.push

import com.earwyrm.app.core.auth.AuthManager
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages FCM push notification token registration with Supabase.
 *
 * To enable push notifications:
 * 1. Create a Firebase project and add the Android app
 * 2. Download google-services.json to android/app/
 * 3. Uncomment Firebase dependencies in build.gradle.kts
 * 4. Uncomment google-services plugin in build.gradle.kts
 * 5. Create EarwyrmMessagingService (FirebaseMessagingService subclass)
 * 6. Add FCM server key to Supabase Edge Function secrets
 */
@Singleton
class PushManager @Inject constructor(
    private val supabase: SupabaseClient,
    private val authManager: AuthManager
) {
    suspend fun registerToken(token: String) {
        val userId = authManager.userId ?: return
        try {
            supabase.postgrest.from("device_tokens").upsert(
                DeviceTokenInsert(userId = userId, token = token, platform = "android")
            )
        } catch (_: Exception) { }
    }

    suspend fun removeToken() {
        val userId = authManager.userId ?: return
        try {
            supabase.postgrest.from("device_tokens").delete {
                filter { eq("user_id", userId); eq("platform", "android") }
            }
        } catch (_: Exception) { }
    }
}

@Serializable
private data class DeviceTokenInsert(
    @SerialName("user_id") val userId: String,
    val token: String,
    val platform: String
)
