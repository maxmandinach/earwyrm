import SwiftUI

struct SignupView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var username = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showConfirmation = false

    private var isUsernameValid: Bool {
        let regex = /^[a-zA-Z0-9_]{3,20}$/
        return username.wholeMatch(of: regex) != nil
    }

    var body: some View {
        ZStack {
            Theme.Light.background
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: Theme.Spacing.lg) {
                    Spacer()
                        .frame(height: Theme.Spacing.xl)

                    Text("join earwyrm")
                        .font(Theme.caveat(36))
                        .foregroundStyle(Theme.Light.text)

                    // Form
                    VStack(spacing: Theme.Spacing.md) {
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

                        SecureField("Password", text: $password)
                            .textFieldStyle(.plain)
                            .textContentType(.newPassword)
                            .padding(Theme.Spacing.md)
                            .background(Theme.Light.card)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .font(Theme.dmSans(15))
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(Theme.dmSans(13))
                            .foregroundStyle(.red.opacity(0.8))
                            .multilineTextAlignment(.center)
                    }

                    // Sign Up Button
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
                    .disabled(!isUsernameValid || email.isEmpty || password.count < 6 || isLoading)
                    .opacity(!isUsernameValid || email.isEmpty || password.count < 6 ? 0.5 : 1)

                    // Back to Login
                    Button {
                        dismiss()
                    } label: {
                        Text("Already have an account? **Sign in**")
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.Light.secondary)
                    }
                }
                .padding(.horizontal, Theme.Spacing.lg)
            }
        }
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(Theme.Light.text)
                }
            }
        }
        .alert("Check your email", isPresented: $showConfirmation) {
            Button("OK") { dismiss() }
        } message: {
            Text("We sent a confirmation link to \(email). Tap it to activate your account.")
        }
    }

    private func signUp() {
        guard isUsernameValid, !email.isEmpty, password.count >= 6 else { return }
        isLoading = true
        errorMessage = nil
        Task {
            do {
                try await auth.signUp(email: email, password: password, username: username)
                showConfirmation = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

#Preview {
    NavigationStack {
        SignupView()
            .environment(AuthManager())
    }
}
