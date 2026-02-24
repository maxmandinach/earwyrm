import SwiftUI

private enum AuthStep {
    case email
    case signIn
    case signUp
}

struct LoginView: View {
    var onExplore: (() -> Void)? = nil

    @Environment(AuthManager.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @State private var username = ""
    @State private var step: AuthStep = .email
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showConfirmation = false

    private var isUsernameValid: Bool {
        let regex = /^[a-zA-Z0-9_]{3,20}$/
        return username.wholeMatch(of: regex) != nil
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Light.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.Spacing.lg) {
                        Spacer()
                            .frame(height: Theme.Spacing.xxl)

                        // Logo / Title
                        Text("earwyrm")
                            .font(Theme.caveat(42))
                            .foregroundStyle(Theme.Light.text)

                        Text("your lyric journal")
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.Light.secondary)

                        Spacer()
                            .frame(height: Theme.Spacing.lg)

                        // Steps
                        Group {
                            switch step {
                            case .email:
                                emailStep
                            case .signIn:
                                signInStep
                            case .signUp:
                                signUpStep
                            }
                        }
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))

                        if let errorMessage {
                            Text(errorMessage)
                                .font(Theme.dmSans(13))
                                .foregroundStyle(.red.opacity(0.8))
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.lg)
                }
            }
        }
        .alert("Check your email", isPresented: $showConfirmation) {
            Button("OK") {
                withAnimation(.easeInOut(duration: 0.25)) {
                    step = .email
                    password = ""
                    username = ""
                }
            }
        } message: {
            Text("We sent a confirmation link to \(email). Tap it to activate your account.")
        }
    }

    // MARK: - Step 1: Email

    private var emailStep: some View {
        VStack(spacing: Theme.Spacing.md) {
            TextField("Email", text: $email)
                .textFieldStyle(.plain)
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .padding(Theme.Spacing.md)
                .background(Theme.Light.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .font(Theme.dmSans(15))

            Button {
                checkEmail()
            } label: {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Continue")
                    }
                }
                .font(Theme.dmSans(16, weight: .medium))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.Light.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(email.isEmpty || isLoading)
            .opacity(email.isEmpty ? 0.5 : 1)

            if let onExplore {
                Button {
                    onExplore()
                } label: {
                    HStack(spacing: 4) {
                        Text("Just browsing?")
                            .foregroundStyle(Theme.Light.muted)
                        Text("Explore")
                            .foregroundStyle(Theme.Light.accent)
                            .fontWeight(.medium)
                    }
                    .font(Theme.dmSans(14))
                }
                .padding(.top, Theme.Spacing.sm)
            }
        }
    }

    // MARK: - Step 2a: Sign In

    private var signInStep: some View {
        VStack(spacing: Theme.Spacing.md) {
            emailLabel

            SecureField("Password", text: $password)
                .textFieldStyle(.plain)
                .textContentType(.password)
                .padding(Theme.Spacing.md)
                .background(Theme.Light.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .font(Theme.dmSans(15))

            Button {
                signIn()
            } label: {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Sign In")
                    }
                }
                .font(Theme.dmSans(16, weight: .medium))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.Light.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(password.isEmpty || isLoading)
            .opacity(password.isEmpty ? 0.5 : 1)
        }
    }

    // MARK: - Step 2b: Sign Up

    private var signUpStep: some View {
        VStack(spacing: Theme.Spacing.md) {
            emailLabel

            VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                TextField("Username", text: $username)
                    .textFieldStyle(.plain)
                    .textContentType(.username)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .padding(Theme.Spacing.md)
                    .background(Theme.Light.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .font(Theme.dmSans(15))

                if !username.isEmpty && !isUsernameValid {
                    Text("3-20 characters, letters, numbers, underscores only")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(.red.opacity(0.7))
                        .padding(.leading, Theme.Spacing.xs)
                }
            }

            SecureField("Password", text: $password)
                .textFieldStyle(.plain)
                .textContentType(.newPassword)
                .padding(Theme.Spacing.md)
                .background(Theme.Light.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .font(Theme.dmSans(15))

            Button {
                signUp()
            } label: {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Create Account")
                    }
                }
                .font(Theme.dmSans(16, weight: .medium))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.Light.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(!isUsernameValid || password.count < 6 || isLoading)
            .opacity(!isUsernameValid || password.count < 6 ? 0.5 : 1)
        }
    }

    // MARK: - Shared email label with back button

    private var emailLabel: some View {
        Button {
            goBack()
        } label: {
            HStack(spacing: Theme.Spacing.sm) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 13, weight: .semibold))
                Text(email)
                    .font(Theme.dmSans(15))
                Spacer()
            }
            .foregroundStyle(Theme.Light.accent)
            .padding(Theme.Spacing.md)
            .background(Theme.Light.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Actions

    private func checkEmail() {
        guard !email.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        Task {
            do {
                let exists = try await auth.checkEmailExists(email: email)
                withAnimation(.easeInOut(duration: 0.25)) {
                    step = exists ? .signIn : .signUp
                }
                Haptics.light()
            } catch {
                errorMessage = error.localizedDescription
                Haptics.error()
            }
            isLoading = false
        }
    }

    private func signIn() {
        guard !password.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        Task {
            do {
                try await auth.signIn(email: email, password: password)
                Haptics.success()
            } catch {
                errorMessage = error.localizedDescription
                Haptics.error()
            }
            isLoading = false
        }
    }

    private func signUp() {
        guard isUsernameValid, password.count >= 6 else { return }
        isLoading = true
        errorMessage = nil
        Task {
            do {
                try await auth.signUp(email: email, password: password, username: username)
                Haptics.success()
                showConfirmation = true
            } catch {
                errorMessage = error.localizedDescription
                Haptics.error()
            }
            isLoading = false
        }
    }

    private func goBack() {
        withAnimation(.easeInOut(duration: 0.25)) {
            step = .email
            password = ""
            username = ""
            errorMessage = nil
        }
    }
}

#Preview {
    LoginView()
        .environment(AuthManager())
}
