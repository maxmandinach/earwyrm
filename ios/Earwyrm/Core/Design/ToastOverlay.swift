import SwiftUI

struct ToastOverlay: View {
    @Environment(ToastManager.self) private var toastManager

    var body: some View {
        VStack {
            if let toast = toastManager.currentToast {
                Text(toast.message)
                    .font(Theme.dmSans(14, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        Capsule()
                            .fill(toast.style == .error
                                  ? Color.red.opacity(0.85)
                                  : Theme.textPrimary.opacity(0.85))
                    )
                    .onTapGesture { toastManager.dismiss() }
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .id(toast.id)
            }

            Spacer()
        }
        .padding(.top, 8)
        .animation(.spring(duration: 0.3), value: toastManager.currentToast?.id)
    }
}
