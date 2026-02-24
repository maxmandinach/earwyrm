import SwiftUI

struct OnboardingView: View {
    let onComplete: () -> Void

    @State private var showTour = false

    var body: some View {
        ZStack {
            if showTour {
                OnboardingTourView(onComplete: onComplete)
                    .transition(.opacity.combined(with: .move(edge: .trailing)))
            } else {
                OnboardingSplashView {
                    withAnimation(.easeInOut(duration: 0.4)) {
                        showTour = true
                    }
                }
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.4), value: showTour)
    }
}
