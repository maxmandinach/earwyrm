import SwiftUI

/// Horizontal thumbnail carousel for browsing art variants.
/// Shows accent border + checkmark on the active variant.
struct ArtGalleryStrip: View {
    @Bindable var viewModel: ArtGalleryViewModel
    var onSelectionChanged: (() -> Void)?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(Array(viewModel.variants.enumerated()), id: \.offset) { index, entry in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            viewModel.activeVariantIndex = index
                        }
                        Haptics.light()
                        onSelectionChanged?()
                    } label: {
                        Image(uiImage: entry.image)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 56, height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .strokeBorder(
                                        index == viewModel.activeVariantIndex ? Theme.accent : Theme.dividerColor.opacity(0.5),
                                        lineWidth: index == viewModel.activeVariantIndex ? 2.5 : 1
                                    )
                            )
                            .overlay(alignment: .bottomTrailing) {
                                if index == viewModel.activeVariantIndex {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 15))
                                        .foregroundStyle(Theme.accent)
                                        .background(Circle().fill(Color.white).padding(1))
                                        .offset(x: 4, y: 4)
                                }
                            }
                            .scaleEffect(index == viewModel.activeVariantIndex ? 1.05 : 1.0)
                    }
                }
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 4)
        }
    }
}
