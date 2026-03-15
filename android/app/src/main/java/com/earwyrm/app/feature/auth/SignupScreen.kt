package com.earwyrm.app.feature.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.Theme
import kotlinx.coroutines.launch

@Composable
fun SignupScreen(onBackToLogin: () -> Unit, viewModel: AuthViewModel = hiltViewModel()) {
    var email by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    val error by viewModel.error.collectAsState()
    val isLoading by viewModel.isSubmitting.collectAsState()
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val passwordsMatch = password == confirmPassword || confirmPassword.isEmpty()
    val usernameValid = username.isEmpty() || Regex("^[a-zA-Z0-9_]{3,20}$").matches(username)

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("earwyrm", fontFamily = CaveatFamily, fontSize = 48.sp, fontWeight = FontWeight.Bold, color = Theme.accent)
        Spacer(Modifier.height(8.dp))
        Text("create your account", style = Theme.dmSans(16f), color = Theme.textSecondary)
        Spacer(Modifier.height(32.dp))
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email", style = Theme.dmSans(14f)) }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next), keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Theme.accent, cursorColor = Theme.accent, focusedLabelColor = Theme.accent), shape = RoundedCornerShape(12.dp))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = username, onValueChange = { username = it.lowercase() }, label = { Text("Username", style = Theme.dmSans(14f)) }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = !usernameValid, supportingText = if (!usernameValid) { { Text("3-20 chars: letters, numbers, underscores", style = Theme.dmSans(12f)) } } else null, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next), keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Theme.accent, cursorColor = Theme.accent, focusedLabelColor = Theme.accent), shape = RoundedCornerShape(12.dp))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password", style = Theme.dmSans(14f)) }, modifier = Modifier.fillMaxWidth(), singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next), keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Theme.accent, cursorColor = Theme.accent, focusedLabelColor = Theme.accent), shape = RoundedCornerShape(12.dp))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = confirmPassword, onValueChange = { confirmPassword = it }, label = { Text("Confirm Password", style = Theme.dmSans(14f)) }, modifier = Modifier.fillMaxWidth(), singleLine = true, visualTransformation = PasswordVisualTransformation(), isError = !passwordsMatch, supportingText = if (!passwordsMatch) { { Text("Passwords don't match", style = Theme.dmSans(12f)) } } else null, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Theme.accent, cursorColor = Theme.accent, focusedLabelColor = Theme.accent), shape = RoundedCornerShape(12.dp))
        if (error != null) { Spacer(Modifier.height(8.dp)); Text(error ?: "", style = Theme.dmSans(13f), color = Theme.error, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
        Spacer(Modifier.height(24.dp))
        Button(onClick = { scope.launch { viewModel.signUp(email, password, username) } }, modifier = Modifier.fillMaxWidth().height(50.dp), enabled = email.isNotBlank() && username.isNotBlank() && password.isNotBlank() && passwordsMatch && usernameValid && !isLoading, colors = ButtonDefaults.buttonColors(containerColor = Theme.accent, contentColor = Color.White), shape = RoundedCornerShape(12.dp)) {
            if (isLoading) CircularProgressIndicator(color = Color.White, modifier = Modifier.height(20.dp)) else Text("Create Account", style = Theme.dmSans(16f, FontWeight.SemiBold))
        }
        Spacer(Modifier.height(16.dp))
        TextButton(onClick = onBackToLogin) { Text("Already have an account? Sign In", style = Theme.dmSans(14f), color = Theme.accent) }
    }
}
