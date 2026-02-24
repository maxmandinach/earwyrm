import SwiftUI

struct ProfileNotesView: View {
    let notes: [NoteWithLyric]

    var body: some View {
        if notes.isEmpty {
            emptyState
        } else {
            LazyVStack(spacing: Theme.Spacing.sm) {
                ForEach(notes) { item in
                    if let lyric = item.lyric {
                        NavigationLink(value: LyricWithProfile(lyric: lyric, username: nil)) {
                            NoteRow(item: item)
                        }
                        .buttonStyle(.plain)
                    } else {
                        NoteRow(item: item)
                    }
                }
            }
            .padding(.horizontal, Theme.Spacing.md)
            .padding(.top, Theme.Spacing.sm)
        }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Spacer().frame(height: 60)
            Text("no notes yet")
                .font(Theme.caveat(28))
                .foregroundStyle(Theme.textPrimary)
            Text("Add personal annotations to lyrics you love.")
                .font(Theme.dmSans(14))
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }
}

// MARK: - Row

private struct NoteRow: View {
    let item: NoteWithLyric

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            // Note content
            Text(item.note.content)
                .font(Theme.noteFont(15))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(4)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Associated lyric context
            if let lyric = item.lyric {
                HStack(spacing: 0) {
                    Rectangle()
                        .fill(Theme.accent.opacity(0.4))
                        .frame(width: 2)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(lyric.content)
                            .font(Theme.caveat(20))
                            .foregroundStyle(Theme.textSecondary)
                            .lineLimit(2)

                        if let song = lyric.songTitle {
                            Text(song)
                                .font(Theme.dmSansItalic(12))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                    .padding(.leading, Theme.Spacing.sm)
                }
            }

            // Meta row
            HStack {
                HStack(spacing: 3) {
                    Image(systemName: item.note.isPublic == true ? "globe" : "lock")
                        .font(.system(size: 10))
                    Text(item.note.isPublic == true ? "public" : "private")
                        .font(Theme.dmSans(11))
                }
                .foregroundStyle(Theme.textMuted)

                Spacer()

                Text(relativeDate(item.note.createdAt))
                    .font(Theme.dmSans(11))
                    .foregroundStyle(Theme.textMuted)
                    .opacity(0.7)
            }
        }
        .padding(Theme.Spacing.md)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }

    private func relativeDate(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "just now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        if interval < 86400 { return "\(Int(interval / 3600))h ago" }
        if interval < 604800 { return "\(Int(interval / 86400))d ago" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}
