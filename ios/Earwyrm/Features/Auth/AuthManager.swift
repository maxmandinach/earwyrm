import Foundation
import Supabase

@Observable
@MainActor
final class AuthManager {
    var session: Session?
    var profile: Profile?
    var isLoading = true
    var error: String?

    var isAuthenticated: Bool { session != nil }
    var userId: UUID? { session.map { UUID(uuidString: $0.user.id.uuidString) } ?? nil }

    init() {
        Task {
            // Get initial session
            if let session = try? await supabase.auth.session {
                self.session = session
                await self.fetchProfile(userId: session.user.id)
            }
            self.isLoading = false

            // Listen for auth state changes
            for await (event, session) in supabase.auth.authStateChanges {
                guard event == .signedIn || event == .signedOut || event == .tokenRefreshed else { continue }
                self.session = session
                if session == nil {
                    self.profile = nil
                }
                if let session {
                    await self.fetchProfile(userId: session.user.id)
                }
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        error = nil
        let session = try await supabase.auth.signIn(
            email: email,
            password: password
        )
        self.session = session
        await fetchProfile(userId: session.user.id)
    }

    func signUp(email: String, password: String, username: String) async throws {
        error = nil
        let usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
        guard username.wholeMatch(of: usernameRegex) != nil else {
            throw AuthError.invalidUsername
        }

        try await supabase.auth.signUp(
            email: email,
            password: password,
            data: ["username": .string(username.lowercased())]
        )
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
        session = nil
        profile = nil
    }

    private func fetchProfile(userId: UUID) async {
        do {
            let profile: Profile = try await supabase
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value
            self.profile = profile
        } catch {
            // Profile may not exist yet (new signup)
            print("Could not fetch profile: \(error)")
        }
    }
}

enum AuthError: LocalizedError {
    case invalidUsername

    var errorDescription: String? {
        switch self {
        case .invalidUsername:
            return "Username must be 3-20 characters and contain only letters, numbers, and underscores."
        }
    }
}
