import SwiftUI
import UIKit
import StoreKit

struct ProfileSettingsSheet: View {
    @Environment(AuthManager.self) private var auth
    @Environment(SubscriptionManager.self) private var subscriptionManager
    @Environment(AppearanceManager.self) private var appearance
    @Environment(\.dismiss) private var dismiss
    @State private var vm = SettingsViewModel()
    @State private var isSigningOut = false
    @State private var hasLoaded = false
    @State private var showPaywall = false
    @State private var showTipJar = false
    @AppStorage("preferredMusicService") private var preferredMusicService = "spotify"

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.Spacing.lg) {
                        subscriptionSection
                        tipJarSection
                        appearanceSection
                        musicServiceSection
                        editProfileSection
                        notificationsSection
                        privacySection
                        accountSection
                        legalSection
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
                            .background(Theme.textPrimary.opacity(0.85))
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
                        .foregroundStyle(Theme.accent)
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
        .sheet(isPresented: $showPaywall) {
            EarwyrmPlusPaywall()
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showTipJar) {
            TipJarSheet()
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Appearance

    private var appearanceSection: some View {
        @Bindable var appearance = appearance
        return settingsSection("appearance") {
            Picker("Appearance", selection: $appearance.mode) {
                ForEach(AppearanceManager.Mode.allCases, id: \.self) { mode in
                    Text(mode.label).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .onChange(of: appearance.mode) { _, newMode in
                Analytics.track(.appearanceChanged, ["mode": newMode.rawValue])
            }
        }
    }

    // MARK: - Music Service

    private var musicServiceSection: some View {
        settingsSection("music") {
            VStack(spacing: Theme.Spacing.md) {
                musicServiceRow("spotify", icon: "SpotifyIcon", name: "Spotify", color: Color(red: 0.114, green: 0.725, blue: 0.329))
                musicServiceRow("apple_music", icon: "AppleMusicIcon", name: "Apple Music", color: Color(red: 0.988, green: 0.235, blue: 0.267))
                musicServiceRow("youtube_music", icon: "YouTubeMusicIcon", name: "YouTube Music", color: .red)
            }
        }
    }

    private func musicServiceRow(_ value: String, icon: String, name: String, color: Color) -> some View {
        Button {
            preferredMusicService = value
            Haptics.light()
        } label: {
            HStack(spacing: Theme.Spacing.sm) {
                Image(icon)
                    .renderingMode(.template)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 18, height: 18)
                    .foregroundStyle(color)
                    .frame(width: 24)
                Text(name)
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
                if preferredMusicService == value {
                    Image(systemName: "checkmark")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Theme.accent)
                }
            }
        }
    }

    // MARK: - Subscription

    private var subscriptionSection: some View {
        settingsSection("earwyrm+") {
            if subscriptionManager.isPlus {
                VStack(spacing: Theme.Spacing.sm) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("earwyrm+ active")
                                .font(Theme.dmSans(15, weight: .medium))
                                .foregroundStyle(Theme.textPrimary)
                            Text("thank you for your support")
                                .font(Theme.dmSans(13))
                                .foregroundStyle(Theme.textMuted)
                        }
                        Spacer()
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(Theme.accent)
                    }

                    Button {
                        Task {
                            try? await AppStore.showManageSubscriptions(in: windowScene)
                        }
                    } label: {
                        Text("Manage Subscription")
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.accent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Theme.accent.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            } else {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("free tier")
                            .font(Theme.dmSans(15, weight: .medium))
                            .foregroundStyle(Theme.textPrimary)
                        Text("AI lyric art, custom collections & more")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.textMuted)
                    }
                    Spacer()
                    Button {
                        showPaywall = true
                    } label: {
                        Text("Upgrade")
                            .font(Theme.dmSans(14, weight: .medium))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Theme.accent)
                            .clipShape(Capsule())
                    }
                }
            }
        }
    }

    private var windowScene: UIWindowScene {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first!
    }

    // MARK: - Tip Jar

    private var tipJarSection: some View {
        settingsSection("support earwyrm") {
            Button {
                showTipJar = true
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("tip jar")
                            .font(Theme.dmSans(15, weight: .medium))
                            .foregroundStyle(Theme.textPrimary)
                        Text("earwyrm is indie-built — tips help keep it alive")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.textMuted)
                    }
                    Spacer()
                    Image(systemName: "heart.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Theme.accent)
                }
            }
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
                        .foregroundStyle(Theme.textSecondary)

                    HStack(spacing: Theme.Spacing.sm) {
                        Text("@")
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.textMuted)
                        TextField("username", text: $vm.username)
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.textPrimary)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onChange(of: vm.username) { _, _ in
                                vm.usernameDidChange()
                            }
                    }
                    .padding(12)
                    .background(Theme.background)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                    usernameStatusView
                }

                // Display Name
                VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                    Text("display name")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textSecondary)

                    TextField("optional", text: $vm.displayName)
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.textPrimary)
                        .padding(12)
                        .background(Theme.background)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                // Bio
                VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                    HStack {
                        Text("bio")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.textSecondary)
                        Spacer()
                        Text("\(vm.bioRemaining)")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(vm.bioRemaining < 0 ? .red : Theme.textMuted)
                    }

                    TextEditor(text: $vm.bio)
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.textPrimary)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 60, maxHeight: 100)
                        .padding(8)
                        .background(Theme.background)
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
                        .background(vm.canSave ? Theme.accent : Theme.textMuted)
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
                    .foregroundStyle(Theme.textMuted)
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
                        .foregroundStyle(Theme.textPrimary)
                    Text(pushStatusText)
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted)
                }
                Spacer()
                if PushManager.shared.permissionStatus == .denied {
                    Button("Settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    }
                    .font(Theme.dmSans(13, weight: .medium))
                    .foregroundStyle(Theme.accent)
                } else if PushManager.shared.permissionStatus == .notDetermined {
                    Button("Enable") {
                        PushManager.shared.requestPermission()
                    }
                    .font(Theme.dmSans(13, weight: .medium))
                    .foregroundStyle(Theme.accent)
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
                            .foregroundStyle(Theme.textPrimary)
                        Text("let others see your lyrics")
                            .font(Theme.dmSans(12))
                            .foregroundStyle(Theme.textMuted)
                    }
                    Spacer()
                    Toggle("", isOn: Binding(
                        get: { vm.isPublic },
                        set: { _ in toggleVisibility() }
                    ))
                    .labelsHidden()
                    .tint(Theme.accent)
                }

                if vm.isPublic {
                    HStack {
                        Text("earwyrm.app/@\(vm.username.lowercased())")
                            .font(Theme.dmSans(13))
                            .foregroundStyle(Theme.textSecondary)
                            .lineLimit(1)

                        Spacer()

                        Button {
                            vm.copyProfileUrl()
                        } label: {
                            Image(systemName: "doc.on.doc")
                                .font(.system(size: 14))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                    .padding(12)
                    .background(Theme.background)
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
                            .foregroundStyle(Theme.textSecondary)
                        Spacer()
                        Text(email)
                            .font(Theme.dmSans(14))
                            .foregroundStyle(Theme.textMuted)
                    }
                }

                Divider()
                    .foregroundStyle(Theme.dividerColor)

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
                                .foregroundStyle(Theme.textPrimary)
                            Spacer()
                            Image(systemName: vm.showPasswordSection ? "chevron.up" : "chevron.down")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.textMuted)
                        }
                    }

                    if vm.showPasswordSection {
                        VStack(spacing: Theme.Spacing.sm) {
                            SecureField("current password", text: $vm.currentPassword)
                                .font(Theme.dmSans(14))
                                .padding(12)
                                .background(Theme.background)
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                            SecureField("new password (min 6 chars)", text: $vm.newPassword)
                                .font(Theme.dmSans(14))
                                .padding(12)
                                .background(Theme.background)
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                            SecureField("confirm new password", text: $vm.confirmPassword)
                                .font(Theme.dmSans(14))
                                .padding(12)
                                .background(Theme.background)
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
                                .background(vm.canChangePassword ? Theme.accent : Theme.textMuted)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .disabled(!vm.canChangePassword)
                        }
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }

                Divider()
                    .foregroundStyle(Theme.dividerColor)

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

    // MARK: - Legal

    private var legalSection: some View {
        settingsSection("legal") {
            VStack(spacing: Theme.Spacing.md) {
                Link(destination: URL(string: "https://earwyrm.app/privacy")!) {
                    HStack {
                        Text("Privacy Policy")
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.textPrimary)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.textMuted)
                    }
                }

                Divider()
                    .foregroundStyle(Theme.dividerColor)

                Link(destination: URL(string: "https://earwyrm.app/terms")!) {
                    HStack {
                        Text("Terms of Service")
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.textPrimary)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.textMuted)
                    }
                }

                Divider()
                    .foregroundStyle(Theme.dividerColor)

                Link(destination: URL(string: "https://earwyrm.app/dmca.html")!) {
                    HStack {
                        Text("DMCA Policy")
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.textPrimary)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.textMuted)
                    }
                }
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
                        .tint(Theme.textSecondary)
                } else {
                    HStack(spacing: Theme.Spacing.sm) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 15))
                        Text("sign out")
                    }
                }
            }
            .font(Theme.dmSans(15, weight: .medium))
            .foregroundStyle(Theme.textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Section Helper

    private func settingsSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            CaveatText(text: title, size: 22, color: Theme.accent)
                .padding(.leading, 4)

            VStack(alignment: .leading, spacing: 0) {
                content()
            }
            .padding(Theme.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card)
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
