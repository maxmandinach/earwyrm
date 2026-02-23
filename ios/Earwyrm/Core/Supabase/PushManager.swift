import Foundation
import UserNotifications
import UIKit
import Supabase

@Observable
@MainActor
final class PushManager {
    static let shared = PushManager()

    var permissionStatus: UNAuthorizationStatus = .notDetermined

    private init() {}

    // MARK: - Request Permission

    func requestPermission() {
        Task {
            let center = UNUserNotificationCenter.current()
            let settings = await center.notificationSettings()
            permissionStatus = settings.authorizationStatus

            guard settings.authorizationStatus == .notDetermined else {
                if settings.authorizationStatus == .authorized {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                return
            }

            do {
                let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
                permissionStatus = granted ? .authorized : .denied
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            } catch {
                print("Push permission error: \(error)")
            }
        }
    }

    // MARK: - Check Permission

    func checkPermission() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        permissionStatus = settings.authorizationStatus
    }

    // MARK: - Register Token

    func registerToken(_ token: String) async {
        do {
            let userId = try await supabase.auth.session.user.id

            let insert = DeviceTokenInsert(userId: userId, token: token, platform: "ios")
            try await supabase
                .from("device_tokens")
                .upsert(insert, onConflict: "user_id,token")
                .execute()

            print("Device token registered")
        } catch {
            print("Register token error: \(error)")
        }
    }

    // MARK: - Remove Token

    func removeToken() async {
        do {
            let userId = try await supabase.auth.session.user.id
            try await supabase
                .from("device_tokens")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("platform", value: "ios")
                .execute()

            print("Device tokens removed")
        } catch {
            print("Remove token error: \(error)")
        }
    }
}

// MARK: - Models

private struct DeviceTokenInsert: Encodable {
    let userId: UUID
    let token: String
    let platform: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case token
        case platform
    }
}
