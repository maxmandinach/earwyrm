import SwiftUI

struct OnboardingTourView: View {
    let onComplete: () -> Void

    @State private var currentPage = 0
    private let pageCount = 5

    var body: some View {
        ZStack {
            Theme.Light.background
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Skip button
                HStack {
                    Spacer()
                    Button {
                        Haptics.light()
                        onComplete()
                    } label: {
                        Text("Skip")
                            .font(Theme.dmSans(14, weight: .medium))
                            .foregroundStyle(Theme.Light.muted)
                    }
                    .padding(.trailing, Theme.Spacing.lg)
                    .padding(.top, Theme.Spacing.sm)
                }

                // Pages
                TabView(selection: $currentPage) {
                    OnboardingPageView(
                        pageIndex: 0,
                        currentPage: currentPage,
                        tagline: "post a lyric",
                        subtitle: "share what's stuck in your head.",
                        animation: { AnyView(PostLyricAnimation(isActive: currentPage == 0)) }
                    )
                    .tag(0)

                    OnboardingPageView(
                        pageIndex: 1,
                        currentPage: currentPage,
                        tagline: "discover & connect",
                        subtitle: "explore what others are sharing. resonate with what hits. talk about why.",
                        animation: { AnyView(DiscoverConnectAnimation(isActive: currentPage == 1)) }
                    )
                    .tag(1)

                    OnboardingPageView(
                        pageIndex: 2,
                        currentPage: currentPage,
                        tagline: "memory lane",
                        subtitle: "your lyrics come back to you when you least expect it.",
                        animation: { AnyView(MemoryLaneAnimation(isActive: currentPage == 2)) }
                    )
                    .tag(2)

                    OnboardingPageView(
                        pageIndex: 3,
                        currentPage: currentPage,
                        tagline: "build your collection",
                        subtitle: "save and organize the lyrics that stay with you.",
                        animation: { AnyView(CollectionAnimation(isActive: currentPage == 3)) }
                    )
                    .tag(3)

                    OnboardingPageView(
                        pageIndex: 4,
                        currentPage: currentPage,
                        tagline: "what's that song?",
                        subtitle: "enter the lyrics stuck in your head. we'll find the song.",
                        animation: { AnyView(WhatsThatSongAnimation(isActive: currentPage == 4)) }
                    )
                    .tag(4)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                // Indicators / Continue
                ZStack {
                    if currentPage == pageCount - 1 {
                        // Continue button on last page
                        Button {
                            Haptics.light()
                            onComplete()
                        } label: {
                            Text("Continue")
                                .font(Theme.dmSans(16, weight: .medium))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Theme.Light.accent)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .padding(.horizontal, Theme.Spacing.lg)
                        .transition(.opacity.combined(with: .scale(scale: 0.9)))
                    } else {
                        // Dot indicators
                        HStack(spacing: 8) {
                            ForEach(0..<pageCount, id: \.self) { i in
                                Circle()
                                    .fill(i == currentPage ? Theme.Light.accent : Theme.Light.accent.opacity(0.25))
                                    .frame(width: i == currentPage ? 8 : 6, height: i == currentPage ? 8 : 6)
                                    .animation(.easeInOut(duration: 0.2), value: currentPage)
                            }
                        }
                        .transition(.opacity)
                    }
                }
                .frame(height: 50)
                .animation(.easeInOut(duration: 0.3), value: currentPage)

                Spacer()
                    .frame(height: Theme.Spacing.xxl)
            }
        }
    }
}
