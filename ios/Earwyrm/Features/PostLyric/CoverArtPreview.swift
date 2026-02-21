import SwiftUI

struct CoverArtPreview: View {
    let url: String?

    var body: some View {
        if let urlString = url, let imageUrl = URL(string: urlString) {
            AsyncImage(url: imageUrl) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    placeholder
                default:
                    placeholder
                        .overlay {
                            ProgressView()
                                .tint(Theme.Light.muted)
                                .scaleEffect(0.7)
                        }
                }
            }
            .frame(width: 56, height: 56)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .shadow(color: .black.opacity(0.15), radius: 3, y: 1)
        }
    }

    private var placeholder: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Theme.Light.divider)
            .frame(width: 56, height: 56)
    }
}
