package com.earwyrm.app.feature.auth

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import kotlinx.coroutines.launch

private enum class AuthStep { Email, SignIn, SignUp }

@Composable
fun LoginScreen(viewModel: AuthViewModel = hiltViewModel()) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var step by remember { mutableStateOf(AuthStep.Email) }
    var showPassword by remember { mutableStateOf(false) }
    var showConfirmation by remember { mutableStateOf(false) }
    val error by viewModel.error.collectAsState()
    val isLoading by viewModel.isSubmitting.collectAsState()
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val usernameValid = username.isEmpty() || Regex("^[a-zA-Z0-9_]{3,20}$").matches(username)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Spacer(Modifier.height(80.dp))

        Text(
            "earwyrm",
            fontFamily = CaveatFamily,
            fontSize = 42.sp,
            fontWeight = FontWeight.Bold,
            color = Theme.textPrimary
        )

        Text(
            "your lyric journal",
            style = Theme.dmSans(15f),
            color = Theme.textSecondary
        )

        Spacer(Modifier.height(48.dp))

        AnimatedContent(
            targetState = step,
            transitionSpec = {
                slideInHorizontally { it } togetherWith slideOutHorizontally { -it }
            },
            label = "auth_step"
        ) { currentStep ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                when (currentStep) {
                    AuthStep.Email -> {
                        // Email input
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            placeholder = { Text("Email", style = Theme.dmSans(15f)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Email,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(onDone = {
                                focusManager.clearFocus()
                                scope.launch { viewModel.checkEmail(email) { exists -> step = if (exists) AuthStep.SignIn else AuthStep.SignUp } }
                            }),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Theme.accent,
                                cursorColor = Theme.accent
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(Modifier.height(16.dp))

                        Button(
                            onClick = {
                                scope.launch { viewModel.checkEmail(email) { exists -> step = if (exists) AuthStep.SignIn else AuthStep.SignUp } }
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            enabled = email.isNotBlank() && !isLoading,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Theme.accent,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                            } else {
                                Text("Continue", style = Theme.dmSans(16f, FontWeight.Medium))
                            }
                        }
                    }

                    AuthStep.SignIn -> {
                        // Email label with back
                        EmailBackLabel(email = email, onBack = {
                            step = AuthStep.Email
                            password = ""
                            viewModel.clearError()
                        })

                        Spacer(Modifier.height(12.dp))

                        // Password field
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            placeholder = { Text("Password", style = Theme.dmSans(15f)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                            trailingIcon = {
                                TextButton(onClick = { showPassword = !showPassword }) {
                                    Text(
                                        if (showPassword) "Hide" else "Show",
                                        style = Theme.dmSans(12f),
                                        color = Theme.textMuted
                                    )
                                }
                            },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(onDone = {
                                focusManager.clearFocus()
                                scope.launch { viewModel.signIn(email, password) }
                            }),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Theme.accent,
                                cursorColor = Theme.accent
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(Modifier.height(16.dp))

                        Button(
                            onClick = { scope.launch { viewModel.signIn(email, password) } },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            enabled = password.isNotBlank() && !isLoading,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Theme.accent,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                            } else {
                                Text("Sign In", style = Theme.dmSans(16f, FontWeight.Medium))
                            }
                        }
                    }

                    AuthStep.SignUp -> {
                        // Email label with back
                        EmailBackLabel(email = email, onBack = {
                            step = AuthStep.Email
                            password = ""
                            username = ""
                            viewModel.clearError()
                        })

                        Spacer(Modifier.height(12.dp))

                        // Username
                        OutlinedTextField(
                            value = username,
                            onValueChange = { username = it.lowercase() },
                            placeholder = { Text("Username", style = Theme.dmSans(15f)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            isError = !usernameValid,
                            supportingText = if (!usernameValid) {
                                { Text("3-20 characters, letters, numbers, underscores only", style = Theme.dmSans(12f)) }
                            } else null,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Theme.accent,
                                cursorColor = Theme.accent
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(Modifier.height(12.dp))

                        // Password
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            placeholder = { Text("Password", style = Theme.dmSans(15f)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                            trailingIcon = {
                                TextButton(onClick = { showPassword = !showPassword }) {
                                    Text(
                                        if (showPassword) "Hide" else "Show",
                                        style = Theme.dmSans(12f),
                                        color = Theme.textMuted
                                    )
                                }
                            },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(onDone = {
                                focusManager.clearFocus()
                                if (usernameValid && password.length >= 6) {
                                    scope.launch {
                                        viewModel.signUp(email, password, username) {
                                            showConfirmation = true
                                        }
                                    }
                                }
                            }),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Theme.accent,
                                cursorColor = Theme.accent
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(Modifier.height(16.dp))

                        Button(
                            onClick = {
                                scope.launch {
                                    viewModel.signUp(email, password, username) {
                                        showConfirmation = true
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            enabled = usernameValid && username.isNotBlank() && password.length >= 6 && !isLoading,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Theme.accent,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                            } else {
                                Text("Create Account", style = Theme.dmSans(16f, FontWeight.Medium))
                            }
                        }
                    }
                }
            }
        }

        // Error message
        if (error != null) {
            Spacer(Modifier.height(12.dp))
            Text(
                error ?: "",
                style = Theme.dmSans(13f),
                color = Theme.error,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(Modifier.weight(1f))
    }

    // Confirmation dialog after sign-up
    if (showConfirmation) {
        AlertDialog(
            onDismissRequest = { },
            title = { Text("Check your email", style = Theme.dmSans(18f, FontWeight.SemiBold)) },
            text = {
                Text(
                    "We sent a confirmation link to $email. Tap it to activate your account.",
                    style = Theme.dmSans(14f),
                    color = Theme.textSecondary
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showConfirmation = false
                    step = AuthStep.Email
                    password = ""
                    username = ""
                }) {
                    Text("OK", color = Theme.accent)
                }
            }
        )
    }
}

@Composable
private fun EmailBackLabel(email: String, onBack: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onBack() },
        shape = RoundedCornerShape(12.dp),
        color = Theme.card
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.ChevronLeft,
                contentDescription = "Back",
                tint = Theme.accent,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                email,
                style = Theme.dmSans(15f),
                color = Theme.accent
            )
        }
    }
}
