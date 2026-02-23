import SwiftUI
import Supabase

struct ProfileFollowingView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(FollowManager.self) private var followManager
    @Environment(UserFollowManager.self) private var userFollowManager
    @Environment(CollectionManager.self) private var collectionManager

    @State private var followedProfiles: [Profile] = []
    @State private var followerProfiles: [Profile] = []
    @State private var isLoadingProfiles = false
    @State private var isLoadingFollowers = false

    private var artistFollows: [Follow] {
        followManager.follows.filter { $0.filterType == "artist" }
            .sorted { $0.filterValue.localizedCaseInsensitiveCompare($1.filterValue) == .orderedAscending }
    }

    private var songFollows: [Follow] {
        followManager.follows.filter { $0.filterType == "song" }
            .sorted { $0.filterValue.localizedCaseInsensitiveCompare($1.filterValue) == .orderedAscending }
    }

    private var tagFollows: [Follow] {
        followManager.follows.filter { $0.filterType == "tag" }
            .sorted { $0.filterValue.localizedCaseInsensitiveCompare($1.filterValue) == .orderedAscending }
    }

    private var hasAnyFollows: Bool {
        !followManager.follows.isEmpty || !userFollowManager.followingIds.isEmpty || !followerProfiles.isEmpty || !collectionManager.collections.isEmpty
    }

    var body: some View {
        if !hasAnyFollows {
            emptyState
        } else {
            LazyVStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                // Followers section
                if !followerProfiles.isEmpty || isLoadingFollowers {
                    followersSection
                }
                // People you follow
                if !userFollowManager.followingIds.isEmpty {
                    peopleSection
                }
                if !artistFollows.isEmpty {
                    followSection(title: "Artists", icon: "music.mic", follows: artistFollows, type: "artist")
                }
                if !songFollows.isEmpty {
                    followSection(title: "Songs", icon: "music.note", follows: songFollows, type: "song")
                }
                if !tagFollows.isEmpty {
                    followSection(title: "Tags", icon: "tag", follows: tagFollows, type: "tag")
                }
                if !collectionManager.collections.isEmpty {
                    collectionsSection
                }
            }
            .padding(.horizontal, Theme.Spacing.md)
            .padding(.top, Theme.Spacing.sm)
        }
    }

    // MARK: - Followers Section

    private var followersSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack(spacing: 6) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 13))
                Text("Followers")
                    .font(Theme.dmSans(14, weight: .medium))
                Text("(\(followerProfiles.count))")
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.Light.muted)
            }
            .foregroundStyle(Theme.Light.secondary)
            .padding(.horizontal, Theme.Spacing.xs)

            VStack(spacing: 0) {
                if isLoadingFollowers {
                    HStack {
                        Spacer()
                        ProgressView()
                            .tint(Theme.Light.accent)
                        Spacer()
                    }
                    .padding(.vertical, 12)
                } else {
                    ForEach(followerProfiles) { profile in
                        HStack {
                            NavigationLink(value: ProfileDestination(userId: profile.id, username: profile.username)) {
                                HStack(spacing: 8) {
                                    Circle()
                                        .fill(Theme.Light.background)
                                        .frame(width: 32, height: 32)
                                        .overlay {
                                            CaveatText(text: String(profile.username.prefix(1)).uppercased(), size: 16, color: Theme.Light.accent)
                                        }

                                    Text("@\(profile.username)")
                                        .font(Theme.dmSans(15))
                                        .foregroundStyle(Theme.Light.text)
                                }
                            }

                            Spacer()
                        }
                        .padding(.horizontal, Theme.Spacing.md)
                        .padding(.vertical, 12)

                        if profile.id != followerProfiles.last?.id {
                            Divider()
                                .foregroundStyle(Theme.Light.divider)
                                .padding(.horizontal, Theme.Spacing.md)
                        }
                    }
                }
            }
            .background(Theme.Light.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
        }
        .task {
            await loadFollowerProfiles()
        }
    }

    // MARK: - People Section (Following)

    private var peopleSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack(spacing: 6) {
                Image(systemName: "person.2")
                    .font(.system(size: 13))
                Text("People")
                    .font(Theme.dmSans(14, weight: .medium))
                Text("(\(userFollowManager.followingIds.count))")
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.Light.muted)
            }
            .foregroundStyle(Theme.Light.secondary)
            .padding(.horizontal, Theme.Spacing.xs)

            VStack(spacing: 0) {
                if isLoadingProfiles {
                    HStack {
                        Spacer()
                        ProgressView()
                            .tint(Theme.Light.accent)
                        Spacer()
                    }
                    .padding(.vertical, 12)
                } else {
                    ForEach(followedProfiles) { profile in
                        HStack {
                            NavigationLink(value: ProfileDestination(userId: profile.id, username: profile.username)) {
                                HStack(spacing: 8) {
                                    Circle()
                                        .fill(Theme.Light.background)
                                        .frame(width: 32, height: 32)
                                        .overlay {
                                            CaveatText(text: String(profile.username.prefix(1)).uppercased(), size: 16, color: Theme.Light.accent)
                                        }

                                    Text("@\(profile.username)")
                                        .font(Theme.dmSans(15))
                                        .foregroundStyle(Theme.Light.text)
                                }
                            }

                            Spacer()

                            Button {
                                Haptics.light()
                                Task {
                                    if let userId = auth.userId {
                                        await userFollowManager.unfollow(
                                            currentUserId: userId,
                                            targetUserId: profile.id
                                        )
                                        followedProfiles.removeAll { $0.id == profile.id }
                                    }
                                }
                            } label: {
                                Text("Unfollow")
                                    .font(Theme.dmSans(12, weight: .medium))
                                    .foregroundStyle(Theme.Light.muted)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Theme.Light.background)
                                    .clipShape(Capsule())
                            }
                        }
                        .padding(.horizontal, Theme.Spacing.md)
                        .padding(.vertical, 12)

                        if profile.id != followedProfiles.last?.id {
                            Divider()
                                .foregroundStyle(Theme.Light.divider)
                                .padding(.horizontal, Theme.Spacing.md)
                        }
                    }
                }
            }
            .background(Theme.Light.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
        }
        .task {
            await loadFollowedProfiles()
        }
    }

    // MARK: - Load Profiles

    private func loadFollowerProfiles() async {
        guard let userId = auth.userId else { return }
        isLoadingFollowers = true
        let ids = await userFollowManager.fetchFollowerIds(userId: userId)
        guard !ids.isEmpty else {
            followerProfiles = []
            isLoadingFollowers = false
            return
        }
        do {
            let profiles: [Profile] = try await supabase
                .from("profiles")
                .select()
                .in("id", values: ids.map(\.uuidString))
                .execute()
                .value
            followerProfiles = profiles.sorted {
                $0.username.localizedCaseInsensitiveCompare($1.username) == .orderedAscending
            }
        } catch {
            print("Load follower profiles error: \(error)")
        }
        isLoadingFollowers = false
    }

    private func loadFollowedProfiles() async {
        let ids = Array(userFollowManager.followingIds)
        guard !ids.isEmpty else {
            followedProfiles = []
            return
        }
        isLoadingProfiles = true
        do {
            let profiles: [Profile] = try await supabase
                .from("profiles")
                .select()
                .in("id", values: ids.map(\.uuidString))
                .execute()
                .value
            followedProfiles = profiles.sorted {
                $0.username.localizedCaseInsensitiveCompare($1.username) == .orderedAscending
            }
        } catch {
            print("Load followed profiles error: \(error)")
        }
        isLoadingProfiles = false
    }

    // MARK: - Collections Section

    private var collectionsSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack(spacing: 6) {
                Image(systemName: "rectangle.stack")
                    .font(.system(size: 13))
                Text("Collections")
                    .font(Theme.dmSans(14, weight: .medium))
                Text("(\(collectionManager.collections.count))")
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.Light.muted)
            }
            .foregroundStyle(Theme.Light.secondary)
            .padding(.horizontal, Theme.Spacing.xs)

            VStack(spacing: 0) {
                ForEach(collectionManager.collections) { collection in
                    NavigationLink(value: collection) {
                        HStack(spacing: 10) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(CollectionColors.color(for: collection.color ?? "charcoal"))
                                .frame(width: 4, height: 20)

                            Text(collection.name)
                                .font(Theme.dmSans(15))
                                .foregroundStyle(Theme.Light.text)

                            if collection.isSmart == true {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 10))
                                    .foregroundStyle(Theme.Light.muted)
                            }

                            Spacer()
                        }
                        .padding(.horizontal, Theme.Spacing.md)
                        .padding(.vertical, 12)
                    }

                    if collection.id != collectionManager.collections.last?.id {
                        Divider()
                            .foregroundStyle(Theme.Light.divider)
                            .padding(.horizontal, Theme.Spacing.md)
                    }
                }
            }
            .background(Theme.Light.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Spacer().frame(height: 60)
            Text("not following anything")
                .font(Theme.caveat(28))
                .foregroundStyle(Theme.Light.text)
            Text("Follow artists, songs, and tags from the Explore tab.")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.Light.muted)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }

    // MARK: - Content Follow Section

    private func followSection(title: String, icon: String, follows: [Follow], type: String) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Section header
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 13))
                Text(title)
                    .font(Theme.dmSans(14, weight: .medium))
                Text("(\(follows.count))")
                    .font(Theme.dmSans(13))
                    .foregroundStyle(Theme.Light.muted)
            }
            .foregroundStyle(Theme.Light.secondary)
            .padding(.horizontal, Theme.Spacing.xs)

            // Rows
            VStack(spacing: 0) {
                ForEach(follows) { follow in
                    HStack {
                        Text(follow.filterValue)
                            .font(Theme.dmSans(15))
                            .foregroundStyle(Theme.Light.text)

                        Spacer()

                        Button {
                            Task {
                                if let userId = auth.userId {
                                    await followManager.unfollow(
                                        userId: userId,
                                        type: type,
                                        value: follow.filterValue
                                    )
                                }
                            }
                        } label: {
                            Text("Unfollow")
                                .font(Theme.dmSans(12, weight: .medium))
                                .foregroundStyle(Theme.Light.muted)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Theme.Light.background)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.vertical, 12)

                    if follow.id != follows.last?.id {
                        Divider()
                            .foregroundStyle(Theme.Light.divider)
                            .padding(.horizontal, Theme.Spacing.md)
                    }
                }
            }
            .background(Theme.Light.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
        }
    }
}
