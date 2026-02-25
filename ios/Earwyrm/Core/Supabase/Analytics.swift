import Foundation
import Supabase

enum AnalyticsEvent: String {
    case screenView              = "screen_view"
    case onboardingSplashShown   = "onboarding_splash_shown"
    case onboardingPageViewed    = "onboarding_page_viewed"
    case onboardingSkipped       = "onboarding_skipped"
    case onboardingCompleted     = "onboarding_completed"
    case paywallShown            = "paywall_shown"
    case paywallProductTapped    = "paywall_product_tapped"
    case paywallDismissed        = "paywall_dismissed"
    case paywallRestoreTapped    = "paywall_restore_tapped"
    case searchPerformed         = "search_performed"
    case searchNoResults         = "search_no_results"
    case shareActionChosen       = "share_action_chosen"
    case collectionCapHit        = "collection_cap_hit"
    case postLyricStarted        = "post_lyric_started"
    case postLyricCompleted      = "post_lyric_completed"
    case appearanceChanged       = "appearance_changed"
    case interestPickerShown     = "interest_picker_shown"
    case interestPickerCompleted = "interest_picker_completed"
}

private struct AnalyticsInsert: Encodable {
    let user_id: String?
    let event: String
    let properties: [String: String]
}

enum Analytics {
    static func track(_ event: AnalyticsEvent, _ properties: [String: String] = [:]) {
        Task.detached(priority: .utility) {
            do {
                let userId = try? await supabase.auth.session.user.id
                let row = AnalyticsInsert(
                    user_id: userId?.uuidString,
                    event: event.rawValue,
                    properties: properties
                )
                try await supabase
                    .from("analytics_events")
                    .insert(row)
                    .execute()
            } catch {
                #if DEBUG
                print("[Analytics] \(event.rawValue) failed: \(error)")
                #endif
            }
        }
    }
}
