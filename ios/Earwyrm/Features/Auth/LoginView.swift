import SwiftUI

struct LoginView: View {
    @Environment(AuthManager.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSignup = false

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

                        // Form
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

                            SecureField("Password", text: $password)
                                .textFieldStyle(.plain)
                                .textContentType(.password)
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

                        // Sign In Button
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
                        .disabled(email.isEmpty || password.isEmpty || isLoading)
                        .opacity(email.isEmpty || password.isEmpty ? 0.5 : 1)

                        // Sign Up Link
                        Button {
                            showSignup = true
                        } label: {
                            Text("Don't have an account? **Sign up**")
                                .font(Theme.dmSans(14))
                                .foregroundStyle(Theme.Light.secondary)
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.lg)
                }
            }
            .navigationDestination(isPresented: $showSignup) {
                SignupView()
            }
        }
    }

    private func signIn() {
        guard !email.isEmpty, !password.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        Task {
            do {
                try await auth.signIn(email: email, password: password)
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

#Preview {
    LoginView()
        .environment(AuthManager())
}
