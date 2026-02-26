import SwiftUI

struct ToastOverlay: View {
    @Environment(ToastManager.self) private var toastManager

    var body: some View {
        VStack {
            if let toast = toastManager.currentToast {
                HStack(spacing: 8) {
                    Image(systemName: toast.style == .error ? "xmark.circle.fill" : "checkmark.circle.fill")
                        .font(.system(size: 15, weight: .medium))

                    Text(toast.message)
                        .font(Theme.dmSans(14, weight: .medium))
                }
                .foregroundStyle(toast.style == .error ? .white : Theme.textPrimary)
                .padding(.horizontal, 18)
                .padding(.vertical, 12)
                .background(
                    Capsule()
                        .fill(.ultraThinMaterial)
                        .overlay(
                            Capsule()
                                .fill(toast.style == .error
                                      ? Color.red.opacity(0.15)
                                      : Theme.accent.opacity(0.15))
                        )
                )
                .shadow(color: .black.opacity(0.1), radius: 12, y: 4)
                .onTapGesture { toastManager.dismiss() }
                .transition(
                    .asymmetric(
                        insertion: .scale(scale: 0.85).combined(with: .opacity).combined(with: .offset(y: -10)),
                        removal: .scale(scale: 0.95).combined(with: .opacity)
                    )
                )
                .id(toast.id)
            }

            Spacer()
        }
        .padding(.top, 8)
        .animation(.spring(duration: 0.4, bounce: 0.3), value: toastManager.currentToast?.id)
    }
}
