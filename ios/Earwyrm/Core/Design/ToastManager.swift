import SwiftUI

@Observable
@MainActor
final class ToastManager {
    enum Style {
        case error, success
    }

    struct Toast: Identifiable {
        let id = UUID()
        let message: String
        let style: Style
    }

    var currentToast: Toast?

    private var dismissTask: Task<Void, Never>?

    func show(_ message: String, style: Style = .error) {
        dismissTask?.cancel()
        currentToast = Toast(message: message, style: style)

        switch style {
        case .error: Haptics.error()
        case .success: Haptics.success()
        }

        dismissTask = Task {
            try? await Task.sleep(for: .seconds(style == .success ? 3.5 : 2.5))
            guard !Task.isCancelled else { return }
            currentToast = nil
        }
    }

    func dismiss() {
        dismissTask?.cancel()
        currentToast = nil
    }
}
