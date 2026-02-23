import Foundation
import Supabase
import UIKit

@Observable
@MainActor
final class SettingsViewModel {
    // MARK: - Edit Profile State
    var username = ""
    var displayName = ""
    var bio = ""

    // MARK: - Username Validation
    enum UsernameStatus { case idle, checking, available, taken, invalid }
    var usernameStatus: UsernameStatus = .idle
    private var originalUsername = ""
    private var usernameCheckTask: Task<Void, Never>?

    // MARK: - Privacy
    var isPublic = false

    // MARK: - Password
    var currentPassword = ""
    var newPassword = ""
    var confirmPassword = ""
    var isChangingPassword = false
    var passwordError: String?
    var passwordSuccess = false
    var showPasswordSection = false

    // MARK: - General
    var isSaving = false
    var saveError: String?
    var showCopiedToast = false

    // MARK: - Computed

    var hasProfileChanges: Bool {
        username != originalUsername || displayName != originalDisplayName || bio != originalBio
    }

    var canSave: Bool {
        hasProfileChanges && !isSaving && usernameIsValid
    }

    var usernameIsValid: Bool {
        if username == originalUsername { return true }
        let regex = /^[a-zA-Z0-9_]{3,20}$/
        guard username.wholeMatch(of: regex) != nil else { return false }
        return usernameStatus == .available
    }

    var bioRemaining: Int { 160 - bio.count }

    var canChangePassword: Bool {
        !currentPassword.isEmpty && newPassword.count >= 6 && newPassword == confirmPassword && !isChangingPassword
    }

    private var originalDisplayName = ""
    private var originalBio = ""

    // MARK: - Load

    func loadFromProfile(_ profile: Profile, email: String?) {
        username = profile.username
        originalUsername = profile.username
        displayName = profile.displayName ?? ""
        originalDisplayName = profile.displayName ?? ""
        bio = profile.bio ?? ""
        originalBio = profile.bio ?? ""
        isPublic = profile.isPublic ?? false
    }

    // MARK: - Username Validation

    func usernameDidChange() {
        usernameCheckTask?.cancel()

        let trimmed = username.lowercased()
        if trimmed == originalUsername.lowercased() {
            usernameStatus = .idle
            return
        }

        let regex = /^[a-zA-Z0-9_]{3,20}$/
        guard trimmed.wholeMatch(of: regex) != nil else {
            usernameStatus = .invalid
            return
        }

        usernameStatus = .checking
        usernameCheckTask = Task {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }

            do {
                let existing: [Profile] = try await supabase
                    .from("profiles")
                    .select("id")
                    .eq("username", value: trimmed)
                    .limit(1)
                    .execute()
                    .value

                guard !Task.isCancelled else { return }
                usernameStatus = existing.isEmpty ? .available : .taken
            } catch {
                guard !Task.isCancelled else { return }
                usernameStatus = .invalid
            }
        }
    }

    // MARK: - Save Profile

    func saveProfile(userId: UUID) async -> Bool {
        isSaving = true
        saveError = nil

        do {
            let update = ProfileUpdate(
                username: username.lowercased(),
                displayName: displayName.isEmpty ? nil : displayName,
                bio: bio.isEmpty ? nil : String(bio.prefix(160))
            )

            try await supabase
                .from("profiles")
                .update(update)
                .eq("id", value: userId.uuidString)
                .execute()

            originalUsername = username.lowercased()
            originalDisplayName = displayName
            originalBio = bio
            isSaving = false
            return true
        } catch {
            saveError = error.localizedDescription
            isSaving = false
            return false
        }
    }

    // MARK: - Toggle Visibility

    func toggleVisibility(userId: UUID) async {
        let newValue = !isPublic
        isPublic = newValue

        do {
            let update = ProfileVisibilityUpdate(isPublic: newValue)
            try await supabase
                .from("profiles")
                .update(update)
                .eq("id", value: userId.uuidString)
                .execute()

            // If going public, also make current lyric public
            if newValue {
                let lyricUpdate = LyricVisibilityUpdate(isPublic: true)
                try await supabase
                    .from("lyrics")
                    .update(lyricUpdate)
                    .eq("user_id", value: userId.uuidString)
                    .eq("is_current", value: true)
                    .execute()
            }
        } catch {
            // Revert on failure
            isPublic = !newValue
            print("Toggle visibility error: \(error)")
        }
    }

    // MARK: - Change Password

    func changePassword(email: String) async {
        isChangingPassword = true
        passwordError = nil
        passwordSuccess = false

        do {
            // Re-authenticate with current password
            _ = try await supabase.auth.signIn(
                email: email,
                password: currentPassword
            )

            // Update to new password
            try await supabase.auth.update(user: UserAttributes(password: newPassword))

            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
            passwordSuccess = true
            isChangingPassword = false

            // Auto-dismiss success after 2s
            Task {
                try? await Task.sleep(for: .seconds(2))
                passwordSuccess = false
                showPasswordSection = false
            }
        } catch {
            passwordError = "Current password is incorrect."
            isChangingPassword = false
        }
    }

    // MARK: - Copy URL

    func copyProfileUrl() {
        let url = "earwyrm.app/@\(username.lowercased())"
        UIPasteboard.general.string = url
        showCopiedToast = true
        Haptics.success()

        Task {
            try? await Task.sleep(for: .seconds(1.5))
            showCopiedToast = false
        }
    }

    // MARK: - Delete Account

    func requestAccountDeletion() {
        let email = "support@earwyrm.app"
        let subject = "Account Deletion Request"
        let body = "Please delete my Earwyrm account (username: @\(username))."
        let mailto = "mailto:\(email)?subject=\(subject.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? subject)&body=\(body.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? body)"

        if let url = URL(string: mailto) {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Encodable Structs

private struct ProfileUpdate: Encodable {
    let username: String
    let displayName: String?
    let bio: String?

    enum CodingKeys: String, CodingKey {
        case username
        case displayName = "display_name"
        case bio
    }
}

private struct ProfileVisibilityUpdate: Encodable {
    let isPublic: Bool

    enum CodingKeys: String, CodingKey {
        case isPublic = "is_public"
    }
}
