import SwiftUI

struct ProfileView: View {
    @Environment(AuthManager.self) private var auth
    @State private var isSigningOut = false

    var body: some View {
        ZStack {
            Theme.Light.background
                .ignoresSafeArea()

            VStack(spacing: Theme.Spacing.lg) {
                Spacer()
                    .frame(height: Theme.Spacing.xxl)

                // Avatar placeholder
                Circle()
                    .fill(Theme.Light.card)
                    .frame(width: 80, height: 80)
                    .overlay {
                        Text(initials)
                            .font(Theme.caveat(28))
                            .foregroundStyle(Theme.Light.accent)
                    }

                // Username
                if let username = auth.profile?.username {
                    Text("@\(username)")
                        .font(Theme.dmSans(20, weight: .medium))
                        .foregroundStyle(Theme.Light.text)
                }

                // Display name
                if let displayName = auth.profile?.displayName {
                    Text(displayName)
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.Light.secondary)
                }

                Spacer()

                // Sign Out
                Button {
                    signOut()
                } label: {
                    Group {
                        if isSigningOut {
                            ProgressView()
                                .tint(Theme.Light.secondary)
                        } else {
                            Text("Sign Out")
                        }
                    }
                    .font(Theme.dmSans(15, weight: .medium))
                    .foregroundStyle(Theme.Light.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.Light.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, Theme.Spacing.lg)
                .padding(.bottom, Theme.Spacing.xl)
            }
        }
    }

    private var initials: String {
        guard let username = auth.profile?.username, let first = username.first else { return "?" }
        return String(first).uppercased()
    }

    private func signOut() {
        isSigningOut = true
        Task {
            try? await auth.signOut()
            isSigningOut = false
        }
    }
}
