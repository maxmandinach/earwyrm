import SwiftUI
import Supabase

/// Threaded comment section that matches the web's CommentSection.
/// Collapsed: shows count or "add a thought". Expanded: full thread with input.
struct CommentSectionView: View {
    let lyricId: UUID
    let currentUserId: UUID?
    let initialCount: Int

    @Environment(AuthGate.self) private var authGate
    @Environment(BlockManager.self) private var blockManager
    @State private var isOpen = false
    @State private var reportCommentId: UUID?
    @State private var comments: [CommentWithProfile] = []
    @State private var count: Int
    @State private var newComment = ""
    @State private var replyTo: ReplyTarget? = nil
    @State private var isSubmitting = false
    @State private var isLoading = false

    private let maxLength = 280

    init(lyricId: UUID, currentUserId: UUID?, initialCount: Int) {
        self.lyricId = lyricId
        self.currentUserId = currentUserId
        self.initialCount = initialCount
        _count = State(initialValue: initialCount)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if isOpen {
                expandedView
            } else {
                collapsedButton
            }
        }
    }

    // MARK: - Collapsed

    private var collapsedButton: some View {
        Button {
            if currentUserId == nil {
                authGate.showAuthSheet = true
            } else {
                withAnimation(.easeOut(duration: 0.2)) {
                    isOpen = true
                }
            }
        } label: {
            Text(currentUserId == nil
                 ? "sign in to join the discussion"
                 : count > 0
                    ? "\(count) \(count == 1 ? "comment" : "comments")"
                    : "add a comment")
                .font(Theme.dmSans(12))
                .foregroundStyle(Theme.textMuted.opacity(0.6))
                .padding(.vertical, 4)
                .padding(.horizontal, 8)
        }
    }

    // MARK: - Expanded

    private var expandedView: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            if isLoading {
                // Skeleton placeholders
                ForEach(0..<min(max(initialCount, 1), 3), id: \.self) { _ in
                    skeletonComment
                }
            } else {
                commentThread
            }

            if !isLoading {
                if currentUserId != nil {
                    commentInput
                }

                Button {
                    withAnimation(.easeOut(duration: 0.2)) {
                        isOpen = false
                    }
                } label: {
                    Text("hide comments")
                        .font(Theme.dmSans(12))
                        .foregroundStyle(Theme.textMuted.opacity(0.4))
                }
                .padding(.top, Theme.Spacing.xs)
            }
        }
        .padding(.top, Theme.Spacing.sm)
        .task {
            await fetchComments()
        }
        .sheet(isPresented: Binding(
            get: { reportCommentId != nil },
            set: { if !$0 { reportCommentId = nil } }
        )) {
            if let commentId = reportCommentId {
                ReportSheet(contentType: "comment", contentId: commentId)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    // MARK: - Comment Thread

    private var commentThread: some View {
        let visible = comments.filter { !blockManager.isBlocked($0.userId) }
        let topLevel = visible.filter { $0.parentCommentId == nil }
        let replyMap = Dictionary(grouping: visible.filter { $0.parentCommentId != nil },
                                  by: { $0.parentCommentId! })

        return VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            ForEach(topLevel) { comment in
                VStack(alignment: .leading, spacing: 0) {
                    commentRow(comment, isReply: false)

                    // Nested replies
                    if let replies = replyMap[comment.id] {
                        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                            ForEach(replies) { reply in
                                commentRow(reply, isReply: true)
                            }
                        }
                        .padding(.leading, Theme.Spacing.lg)
                        .padding(.top, Theme.Spacing.sm)
                        .overlay(alignment: .leading) {
                            Rectangle()
                                .fill(Theme.dividerColor.opacity(0.3))
                                .frame(width: 1)
                                .padding(.leading, 6)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Comment Row

    private func commentRow(_ comment: CommentWithProfile, isReply: Bool) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            // Username + timestamp
            HStack(spacing: 6) {
                if let username = comment.username {
                    HStack(spacing: 2) {
                        Text("@\(username)")
                            .font(Theme.dmSans(12, weight: .medium))
                            .foregroundStyle(Theme.textSecondary.opacity(0.7))
                        if comment.isPlus {
                            PlusBadge()
                        }
                    }
                }
                Text(formatRelativeTime(comment.createdAt))
                    .font(Theme.dmSans(11))
                    .foregroundStyle(Theme.textMuted.opacity(0.4))
            }

            // Content
            Text(comment.content)
                .font(Theme.caveat(isReply ? 18 : 20))
                .foregroundStyle(Theme.textPrimary.opacity(isReply ? 0.6 : 0.7))
                .lineSpacing(2)

            // Actions
            HStack(spacing: Theme.Spacing.md) {
                if currentUserId != nil {
                    Button {
                        Haptics.light()
                        replyTo = ReplyTarget(
                            commentId: comment.id,
                            username: comment.username
                        )
                        newComment = comment.username.map { "@\($0) " } ?? ""
                    } label: {
                        Text("reply")
                            .font(Theme.dmSans(11))
                            .foregroundStyle(Theme.textMuted.opacity(0.4))
                    }
                }

                if currentUserId == comment.userId {
                    Button {
                        deleteComment(comment.id)
                    } label: {
                        Text("delete")
                            .font(Theme.dmSans(11))
                            .foregroundStyle(Theme.textMuted.opacity(0.4))
                    }
                } else if currentUserId != nil {
                    Button {
                        reportCommentId = comment.id
                    } label: {
                        Text("report")
                            .font(Theme.dmSans(11))
                            .foregroundStyle(Theme.textMuted.opacity(0.4))
                    }
                }
            }
            .padding(.top, 2)
        }
    }

    // MARK: - Comment Input

    private var commentInput: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            if replyTo != nil {
                HStack(spacing: 4) {
                    Text("replying")
                        .font(Theme.dmSans(11))
                        .foregroundStyle(Theme.textMuted.opacity(0.5))

                    Button {
                        replyTo = nil
                        newComment = ""
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 10))
                            .foregroundStyle(Theme.textMuted.opacity(0.4))
                    }
                }
            }

            HStack(spacing: 8) {
                TextField(
                    replyTo != nil ? "Reply..." : "Write a comment...",
                    text: $newComment
                )
                .font(Theme.caveat(18))
                .foregroundStyle(Theme.textPrimary)
                .autocorrectionDisabled()
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    Capsule()
                        .stroke(Theme.dividerColor, lineWidth: 1)
                )
                .onChange(of: newComment) { _, value in
                    if value.count > maxLength {
                        newComment = String(value.prefix(maxLength))
                    }
                }
                .toolbar {
                    ToolbarItemGroup(placement: .keyboard) {
                        Spacer()
                        Button("Done") {
                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        }
                        .font(Theme.dmSans(15, weight: .medium))
                        .foregroundStyle(Theme.accent)
                    }
                }

                Button {
                    submitComment()
                } label: {
                    Text(isSubmitting ? "..." : "post")
                        .font(Theme.dmSans(13))
                        .foregroundStyle(Theme.textSecondary.opacity(0.7))
                }
                .disabled(newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
                .opacity(newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.3 : 1)
            }
        }
        .padding(.top, Theme.Spacing.sm)
    }

    // MARK: - Skeleton

    private var skeletonComment: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Theme.dividerColor)
                    .frame(width: 60, height: 10)
                RoundedRectangle(cornerRadius: 2)
                    .fill(Theme.dividerColor)
                    .frame(width: 30, height: 10)
            }
            RoundedRectangle(cornerRadius: 2)
                .fill(Theme.dividerColor)
                .frame(width: 180, height: 14)
        }
        .shimmer()
    }

    // MARK: - Data

    private func fetchComments() async {
        isLoading = true
        do {
            // Fetch all comments for this lyric
            let rawComments: [Comment] = try await supabase
                .from("comments")
                .select("id, lyric_id, user_id, content, parent_comment_id, created_at")
                .eq("lyric_id", value: lyricId.uuidString)
                .order("created_at", ascending: true)
                .execute()
                .value

            // Get unique user IDs and fetch profiles
            let userIds = Array(Set(rawComments.map(\.userId)))
            var profileMap: [UUID: String] = [:]
            var plusMap: [UUID: Bool] = [:]

            if !userIds.isEmpty {
                let profiles: [CommentProfile] = try await supabase
                    .from("profiles")
                    .select("id, username, subscription_tier")
                    .in("id", values: userIds.map(\.uuidString))
                    .execute()
                    .value

                for p in profiles {
                    profileMap[p.id] = p.username
                    plusMap[p.id] = p.isPlus
                }
            }

            // Combine
            comments = rawComments.map { c in
                CommentWithProfile(comment: c, username: profileMap[c.userId], isPlus: plusMap[c.userId] ?? false)
            }
            count = rawComments.count
        } catch {
            print("Fetch comments error: \(error)")
        }
        isLoading = false
    }

    private func submitComment() {
        guard let userId = currentUserId,
              !newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        isSubmitting = true
        let trimmed = newComment.trimmingCharacters(in: .whitespacesAndNewlines)
        let parentId = replyTo?.commentId

        Task {
            do {
                let insert = CommentInsert(
                    lyricId: lyricId,
                    userId: userId,
                    content: trimmed,
                    parentCommentId: parentId
                )

                let newComments: [Comment] = try await supabase
                    .from("comments")
                    .insert(insert)
                    .select("id, lyric_id, user_id, content, parent_comment_id, created_at")
                    .execute()
                    .value

                guard let created = newComments.first else { return }

                // Fetch own profile for display
                let profiles: [CommentProfile] = try await supabase
                    .from("profiles")
                    .select("id, username, subscription_tier")
                    .eq("id", value: userId.uuidString)
                    .limit(1)
                    .execute()
                    .value

                let withProfile = CommentWithProfile(
                    comment: created,
                    username: profiles.first?.username,
                    isPlus: profiles.first?.isPlus ?? false
                )

                Haptics.success()
                comments.append(withProfile)
                count += 1
                newComment = ""
                replyTo = nil
            } catch {
                print("Submit comment error: \(error)")
                Haptics.error()
            }
            isSubmitting = false
        }
    }

    private func deleteComment(_ commentId: UUID) {
        Task {
            do {
                try await supabase
                    .from("comments")
                    .delete()
                    .eq("id", value: commentId.uuidString)
                    .execute()

                Haptics.light()
                comments.removeAll { $0.id == commentId }
                count -= 1
            } catch {
                print("Delete comment error: \(error)")
            }
        }
    }

    // MARK: - Helpers

    private func formatRelativeTime(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)

        if interval < 60 { return "now" }
        if interval < 3600 { return "\(Int(interval / 60))m" }
        if interval < 86400 { return "\(Int(interval / 3600))h" }
        if interval < 604800 { return "\(Int(interval / 86400))d" }

        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Reply Target

private struct ReplyTarget {
    let commentId: UUID
    let username: String?
}

// MARK: - Shimmer Effect

private struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                LinearGradient(
                    colors: [.clear, .white.opacity(0.3), .clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .offset(x: phase)
                .mask(content)
            )
            .onAppear {
                withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                    phase = 200
                }
            }
    }
}

private extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}
