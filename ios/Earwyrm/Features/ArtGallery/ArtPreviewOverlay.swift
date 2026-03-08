import SwiftUI
import UIKit

struct ArtPreviewOverlay: View {
    let image: UIImage
    var onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
                .onTapGesture { onDismiss() }

            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .padding(16)
        }
        .overlay(alignment: .topTrailing) {
            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(.white.opacity(0.8))
                    .padding(20)
            }
        }
        .statusBarHidden()
    }
}
