import SwiftUI

struct FeedFilterBar: View {
    @Binding var search: String
    @Binding var timeRange: TimeRange
    @Binding var sort: SortOption
    @State private var searchOpen = false

    var body: some View {
        if searchOpen {
            // Expanded search field
            HStack(spacing: Theme.Spacing.sm) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.Light.muted)

                TextField("Search lyrics, artists, songs...", text: $search)
                    .font(Theme.dmSans(14))
                    .foregroundStyle(Theme.Light.text)

                Button {
                    search = ""
                    searchOpen = false
                    Haptics.light()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.Light.muted)
                        .frame(width: 28, height: 28)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Theme.Light.card)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        } else {
            // Compact row: search icon + time pills + sort
            HStack(spacing: 0) {
                Button {
                    searchOpen = true
                    Haptics.light()
                } label: {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.Light.muted)
                        .frame(width: 36, height: 36)
                }

                // Time range pills
                HStack(spacing: 2) {
                    ForEach(TimeRange.allCases, id: \.self) { range in
                        Button {
                            timeRange = range
                            Haptics.light()
                        } label: {
                            Text(range.rawValue)
                                .font(Theme.dmSans(12))
                                .foregroundStyle(timeRange == range
                                                 ? Theme.Light.text.opacity(0.6)
                                                 : Theme.Light.text.opacity(0.25))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                        }
                    }
                }

                Spacer()

                // Sort menu
                Menu {
                    ForEach(SortOption.allCases, id: \.self) { option in
                        Button {
                            sort = option
                            Haptics.light()
                        } label: {
                            HStack {
                                Text(option.rawValue)
                                if sort == option {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.system(size: 11))
                        Text(sort.rawValue)
                            .font(Theme.dmSans(12))
                    }
                    .foregroundStyle(Theme.Light.secondary)
                }
            }
        }
    }
}
