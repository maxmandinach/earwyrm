import SwiftUI

/// Horizontal thumbnail carousel for browsing art variants.
/// Shows "none" pill, album art thumbnail (if available), AI variant thumbnails,
/// and an optional generate pill at the end.
struct ArtGalleryStrip: View {
    @Bindable var viewModel: ArtGalleryViewModel
    var onGenerate: (() -> Void)?
    var isGenerating: Bool = false
    var isLocked: Bool = false
    var onSelectionChanged: (() -> Void)?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                // "None" pill
                nonePill

                // Album art thumbnail
                if let coverImage = viewModel.coverArtImage {
                    artThumbnail(
                        image: coverImage,
                        isSelected: viewModel.selectedStyle == .coverArt
                    ) {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            viewModel.selectedStyle = .coverArt
                        }
                        Haptics.light()
                        onSelectionChanged?()
                    }
                }

                // AI variant thumbnails
                ForEach(Array(viewModel.variants.enumerated()), id: \.offset) { index, entry in
                    artThumbnail(
                        image: entry.image,
                        isSelected: viewModel.selectedStyle == .aiVariant(index)
                    ) {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            viewModel.selectedStyle = .aiVariant(index)
                        }
                        Haptics.light()
                        onSelectionChanged?()
                    }
                }

                // Generate pill
                if onGenerate != nil {
                    generatePill
                }
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 4)
        }
    }

    private var nonePill: some View {
        let isSelected = viewModel.selectedStyle == .none
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                viewModel.selectedStyle = .none
            }
            Haptics.light()
            onSelectionChanged?()
        } label: {
            Image(systemName: "circle.slash")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(isSelected ? Theme.accent : Theme.textMuted)
                .frame(width: 56, height: 56)
                .background(Theme.card)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(
                            isSelected ? Theme.accent : Theme.dividerColor.opacity(0.5),
                            lineWidth: isSelected ? 2.5 : 1
                        )
                )
                .scaleEffect(isSelected ? 1.05 : 1.0)
        }
    }

    private var generatePill: some View {
        Button {
            if !isLocked && !isGenerating {
                Haptics.light()
                onGenerate?()
            }
        } label: {
            Group {
                if isGenerating {
                    ProgressView()
                        .scaleEffect(0.7)
                        .tint(Theme.accent)
                } else if isLocked {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.textMuted)
                } else {
                    Image(systemName: "wand.and.stars")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.accent)
                }
            }
            .frame(width: 56, height: 56)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(Theme.dividerColor.opacity(0.5), lineWidth: 1)
            )
        }
    }

    private func artThumbnail(image: UIImage, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(
                            isSelected ? Theme.accent : Theme.dividerColor.opacity(0.5),
                            lineWidth: isSelected ? 2.5 : 1
                        )
                )
                .overlay(alignment: .bottomTrailing) {
                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 15))
                            .foregroundStyle(Theme.accent)
                            .background(Circle().fill(Color.white).padding(1))
                            .offset(x: 4, y: 4)
                    }
                }
                .scaleEffect(isSelected ? 1.05 : 1.0)
        }
    }
}
