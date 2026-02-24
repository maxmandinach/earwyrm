import SwiftUI

@Observable
final class AppearanceManager {
    enum Mode: String, CaseIterable {
        case system, light, dark

        var label: String {
            switch self {
            case .system: "System"
            case .light: "Light"
            case .dark: "Dark"
            }
        }
    }

    var mode: Mode {
        get {
            Mode(rawValue: UserDefaults.standard.string(forKey: "appearanceMode") ?? "system") ?? .system
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: "appearanceMode")
        }
    }

    var resolvedScheme: ColorScheme? {
        switch mode {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}
