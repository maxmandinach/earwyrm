import SwiftUI
import UIKit

struct ProfileSettingsSheet: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var vm = SettingsViewModel()
    @State private var isSigningOut = false
    @State private var hasLoaded = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Light.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.Spacing.lg) {
                        editProfileSection
                        notificationsSection
                        privacySection
                        accountSection
                        signOutButton
                    }
                    .padding(.horizontal, Theme.Spacing.lg)
                    .padding(.top, Theme.Spacing.lg)
                    .padding(.bottom, Theme.Spacing.xxl)
                }
                .scrollDismissesKeyboard(.interactively)

                // Copied toast
                if vm.showCopiedToast {
                    VStack {
                        Spacer()
                        Text("copied!")
                            .font(Theme.dmSans(14, weight: .medium))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Theme.Light.text.opacity(0.85))
                            .clipShape(Capsule())
                            .padding(.bottom, Theme.Spacing.xl)
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .animation(.easeInOut(duration: 0.25), value: vm.showCopiedToast)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(Theme.dmSans(15, weight: .medium))
                        .foregroundStyle(Theme.Light.accent)
                }
            }
        }
        .task {
            guard !hasLoaded else { return }
            if let profile = auth.profile {
                vm.loadFromProfile(profile, email: auth.session?.user.email)
            }
            hasLoaded = true
        }
    }

    // MARK: - Edit Profile

    private var editProfileSection: some View {
        settingsSection("edit profile") {
            VStack(spacing: Theme.Spacing.md) {
                // Username
                VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                    Text("username")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.Light.secondary)

                    HStack(spacing: Theme.Spacing.sm) {
                        Text("@")
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.Light.muted)
                        TextField("username", text: $vm.username)
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.Light.text)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onChange(of: vm.username) { _, _ in
                                vm.usernameDidChange()
                            }
                    }
                    .padding(12)
                    .background(Theme.Light.background)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                    usernameStatusView
                }

                // Display Name
                VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                    Text("display name")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.Light.secondary)

                    TextField("optional", text: $vm.displayName)
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.Light.text)
                        .padding(12)
                        .background(Theme.Light.background)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                // Bio
                VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                    HStack {
                        Text("bio")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.Light.secondary)
                        Spacer()
                        Text("\(vm.bioRemaining)")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(vm.bioRemaining < 0 ? .red : Theme.Light.muted)
                    }

                    TextEditor(text: $vm.bio)
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.Light.text)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 60, maxHeight: 100)
                        .padding(8)
                        .background(Theme.Light.background)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .onChange(of: vm.bio) { _, newValue in
                            if newValue.count > 160 {
                                vm.bio = String(newValue.prefix(160))
                            }
                        }
                }

                // Save button
                if vm.hasProfileChanges {
                    Button {
                        saveProfile()
                    } label: {
                        Group {
                            if vm.isSaving {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("save")
                                    .font(Theme.dmSans(15, weight: .medium))
                            }
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(vm.canSave ? Theme.Light.accent : Theme.Light.muted)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .disabled(!vm.canSave)

                    if let error = vm.saveError {
                        Text(error)
                            .font(Theme.dmSans(12))
                            .foregroundStyle(.red)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var usernameStatusView: some View {
        switch vm.usernameStatus {
        case .idle:
            EmptyView()
        case .checking:
            HStack(spacing: 4) {
                ProgressView()
                    .scaleEffect(0.6)
                Text("checking...")
                    .font(Theme.dmSans(12))
                    .foregroundStyle(Theme.Light.muted)
            }
        case .available:
            Text("available")
                .font(Theme.dmSans(12))
                .foregroundStyle(.green.opacity(0.8))
        case .taken:
            Text("taken")
                .font(Theme.dmSans(12))
                .foregroundStyle(.red.opacity(0.8))
        case .invalid:
            Text("3-20 chars, letters/numbers/underscores")
                .font(Theme.dmSans(12))
                .foregroundStyle(.red.opacity(0.8))
        }
    }

    // MARK: - Notifications

    private var notificationsSection: some View {
        settingsSection("notifications") {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("push notifications")
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.Light.text)
                    Text(pushStatusText)
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.Light.muted)
                }
                Spacer()
                if PushManager.shared.permissionStatus == .denied {
                    Button("Settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    }
                    .font(Theme.dmSans(13, weight: .medium))
                    .foregroundStyle(Theme.Light.accent)
                } else if PushManager.shared.permissionStatus == .notDetermined {
                    Button("Enable") {
                        PushManager.shared.requestPermission()
                    }
                    .font(Theme.dmSans(13, weight: .medium))
                    .foregroundStyle(Theme.Light.accent)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green.opacity(0.7))
                }
            }
        }
        .task {
            await PushManager.shared.checkPermission()
        }
    }

    private var pushStatusText: String {
        switch PushManager.shared.permissionStatus {
        case .authorized: return "enabled"
        case .denied: return "disabled — tap Settings to enable"
        case .provisional: return "provisional"
        case .notDetermined: return "not set up yet"
        case .ephemeral: return "enabled"
        @unknown default: return "unknown"
        }
    }

    // MARK: - Privacy

    private var privacySection: some View {
        settingsSection("privacy") {
            VStack(spacing: Theme.Spacing.md) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("public profile")
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.Light.text)
                        Text("let others see your lyrics")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.Light.muted)
                    }
                    Spacer()
                    Toggle("", isOn: Binding(
                        get: { vm.isPublic },
                        set: { _ in toggleVisibility() }
                    ))
                    .labelsHidden()
                    .tint(Theme.Light.accent)
                }

                if vm.isPublic {
                    HStack {
                        Text("earwyrm.app/@\(vm.username.lowercased())")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.Light.secondary)
                            .lineLimit(1)

                        Spacer()

                        Button {
                            vm.copyProfileUrl()
                        } label: {
                            Image(systemName: "doc.on.doc")
                                .font(.system(size: 14))
                                .foregroundStyle(Theme.Light.accent)
                        }
                    }
                    .padding(12)
                    .background(Theme.Light.background)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        settingsSection("account") {
            VStack(spacing: Theme.Spacing.md) {
                // Email (read-only)
                if let email = auth.session?.user.email {
                    HStack {
                        Text("email")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.Light.secondary)
                        Spacer()
                        Text(email)
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.Light.muted)
                    }
                }

                Divider()
                    .foregroundStyle(Theme.Light.divider)

                // Change Password
                VStack(spacing: Theme.Spacing.sm) {
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            vm.showPasswordSection.toggle()
                            vm.passwordError = nil
                            vm.passwordSuccess = false
                        }
                    } label: {
                        HStack {
                            Text("change password")
                                .font(Theme.dmSans(15))
                                .foregroundStyle(Theme.Light.text)
                            Spacer()
                            Image(systemName: vm.showPasswordSection ? "chevron.up" : "chevron.down")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.Light.muted)
                        }
                    }

                    if vm.showPasswordSection {
                        VStack(spacing: Theme.Spacing.sm) {
                            SecureField("current password", text: $vm.currentPassword)
                                .font(Theme.dmSans(14))
                                .padding(12)
                                .background(Theme.Light.background)
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                            SecureField("new password (min 6 chars)", text: $vm.newPassword)
                                .font(Theme.dmSans(14))
                                .padding(12)
                                .background(Theme.Light.background)
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                            SecureField("confirm new password", text: $vm.confirmPassword)
                                .font(Theme.dmSans(14))
                                .padding(12)
                                .background(Theme.Light.background)
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                            if let error = vm.passwordError {
                                Text(error)
                                    .font(Theme.dmSans(12))
                                    .foregroundStyle(.red)
                            }

                            if vm.passwordSuccess {
                                Text("password updated!")
                                    .font(Theme.dmSans(12))
                                    .foregroundStyle(.green.opacity(0.8))
                            }

                            Button {
                                changePassword()
                            } label: {
                                Group {
                                    if vm.isChangingPassword {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Text("update password")
                                            .font(Theme.dmSans(14, weight: .medium))
                                    }
                                }
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(vm.canChangePassword ? Theme.Light.accent : Theme.Light.muted)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .disabled(!vm.canChangePassword)
                        }
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }

                Divider()
                    .foregroundStyle(Theme.Light.divider)

                // Delete Account
                Button {
                    vm.requestAccountDeletion()
                } label: {
                    HStack(spacing: Theme.Spacing.sm) {
                        Image(systemName: "trash")
                            .font(.system(size: 13))
                        Text("delete account")
                            .font(Theme.dmSans(14))
                    }
                    .foregroundStyle(.red.opacity(0.7))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Sign Out

    private var signOutButton: some View {
        Button {
            signOut()
        } label: {
            Group {
                if isSigningOut {
                    ProgressView()
                        .tint(Theme.Light.secondary)
                } else {
                    HStack(spacing: Theme.Spacing.sm) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 15))
                        Text("sign out")
                    }
                }
            }
            .font(Theme.dmSans(15, weight: .medium))
            .foregroundStyle(Theme.Light.secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Theme.Light.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Section Helper

    private func settingsSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            CaveatText(text: title, size: 22, color: Theme.Light.accent)
                .padding(.leading, 4)

            VStack(alignment: .leading, spacing: 0) {
                content()
            }
            .padding(Theme.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.Light.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Actions

    private func saveProfile() {
        guard let userId = auth.userId else { return }
        Task {
            let success = await vm.saveProfile(userId: userId)
            if success {
                await auth.refreshProfile()
            }
        }
    }

    private func toggleVisibility() {
        guard let userId = auth.userId else { return }
        Task {
            await vm.toggleVisibility(userId: userId)
            await auth.refreshProfile()
        }
    }

    private func changePassword() {
        guard let email = auth.session?.user.email else { return }
        Task {
            await vm.changePassword(email: email)
        }
    }

    private func signOut() {
        isSigningOut = true
        Task {
            await PushManager.shared.removeToken()
            try? await auth.signOut()
            isSigningOut = false
        }
    }
}
