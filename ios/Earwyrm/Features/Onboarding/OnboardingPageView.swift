import SwiftUI

struct OnboardingPageView: View {
    let pageIndex: Int
    let currentPage: Int
    let tagline: String
    let subtitle: String
    let animation: () -> AnyView

    private var isActive: Bool { currentPage == pageIndex }

    var body: some View {
        VStack(spacing: Theme.Spacing.xl) {
            Spacer()

            animation()
                .frame(height: 240)

            VStack(spacing: Theme.Spacing.sm) {
                CaveatText(text: tagline, size: 28, color: Theme.textPrimary)

                Text(subtitle)
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.Spacing.xl)
            }

            Spacer()
            Spacer()
        }
        .padding(.horizontal, Theme.Spacing.lg)
    }
}

// MARK: - Page 1: "post a lyric"

struct PostLyricAnimation: View {
    let isActive: Bool
    @State private var showCard = false
    @State private var showLines: [Bool] = [false, false, false]
    @State private var showDivider = false
    @State private var showMeta = false
    @State private var showGlow = false

    var body: some View {
        ZStack {
            // Accent glow at top-right
            Circle()
                .fill(Theme.accent.opacity(0.15))
                .frame(width: 50, height: 50)
                .offset(x: 90, y: -70)
                .opacity(showGlow ? 1 : 0)
                .scaleEffect(showGlow ? 1 : 0.5)
                .animation(.easeOut(duration: 0.6).delay(0.9), value: showGlow)

            // Main card
            RoundedRectangle(cornerRadius: 16)
                .fill(Theme.card)
                .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
                .frame(width: 240, height: 160)
                .opacity(showCard ? 1 : 0)
                .scaleEffect(showCard ? 1 : 0.9)
                .offset(y: showCard ? 0 : 20)
                .overlay {
                    VStack(alignment: .leading, spacing: 0) {
                        // Lyric placeholder lines (Caveat-style)
                        VStack(alignment: .leading, spacing: 9) {
                            ForEach(0..<3, id: \.self) { i in
                                let widths: [CGFloat] = [170, 145, 110]
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Theme.accent.opacity(0.35))
                                    .frame(width: widths[i], height: 10)
                                    .opacity(showLines[i] ? 1 : 0)
                                    .offset(x: showLines[i] ? 0 : -8)
                                    .animation(
                                        .easeOut(duration: 0.4).delay(0.5 + Double(i) * 0.15),
                                        value: showLines[i]
                                    )
                            }
                        }

                        Spacer().frame(height: 14)

                        // Divider
                        RoundedRectangle(cornerRadius: 1)
                            .fill(Theme.accent.opacity(0.5))
                            .frame(width: 60, height: 1.5)
                            .opacity(showDivider ? 1 : 0)
                            .animation(.easeOut(duration: 0.3).delay(0.95), value: showDivider)

                        Spacer().frame(height: 8)

                        // Song/artist metadata placeholder
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Theme.accent.opacity(0.2))
                            .frame(width: 90, height: 6)
                            .opacity(showMeta ? 1 : 0)
                            .animation(.easeOut(duration: 0.3).delay(1.05), value: showMeta)
                    }
                    .padding(Theme.Spacing.md)
                    .frame(width: 240, height: 160, alignment: .topLeading)
                }
        }
        .onChange(of: isActive) { _, active in
            if active { playIn() } else { resetState() }
        }
        .onAppear { if isActive { playIn() } }
    }

    private func playIn() {
        resetState()
        withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
            showCard = true
        }
        for i in 0..<3 { showLines[i] = true }
        showDivider = true
        showMeta = true
        showGlow = true
    }

    private func resetState() {
        showCard = false
        showLines = [false, false, false]
        showDivider = false
        showMeta = false
        showGlow = false
    }
}

// MARK: - Page 2: "discover & connect"

struct DiscoverConnectAnimation: View {
    let isActive: Bool
    @State private var fanned = false
    @State private var showWaveform = false
    @State private var showBubble = false
    @State private var barScales: [CGFloat] = [1, 1, 1, 1, 1]

    private let cardRotations: [Double] = [-8, 0, 8]
    private let cardOffsets: [CGFloat] = [-35, 0, 35]

    @ViewBuilder
    private func cardOverlay(index: Int) -> some View {
        if index == 2 {
            VStack(alignment: .leading, spacing: 7) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Theme.accent.opacity(0.35))
                    .frame(width: 110, height: 8)
                RoundedRectangle(cornerRadius: 3)
                    .fill(Theme.accent.opacity(0.35))
                    .frame(width: 90, height: 8)
                Spacer().frame(height: 2)
                RoundedRectangle(cornerRadius: 1)
                    .fill(Theme.accent.opacity(0.5))
                    .frame(width: 40, height: 1.5)
                Spacer().frame(height: 1)
                RoundedRectangle(cornerRadius: 2)
                    .fill(Theme.accent.opacity(0.2))
                    .frame(width: 60, height: 5)
            }
            .padding(12)
            .frame(width: 160, height: 120, alignment: .topLeading)
        } else {
            VStack(alignment: .leading, spacing: 7) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Theme.accent.opacity(0.2))
                    .frame(width: 100, height: 7)
                RoundedRectangle(cornerRadius: 3)
                    .fill(Theme.accent.opacity(0.15))
                    .frame(width: 80, height: 7)
            }
            .padding(12)
            .frame(width: 160, height: 120, alignment: .topLeading)
        }
    }

    var body: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { i in
                RoundedRectangle(cornerRadius: 14)
                    .fill(Theme.card)
                    .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
                    .frame(width: 160, height: 120)
                    .overlay { cardOverlay(index: i) }
                    .rotationEffect(.degrees(fanned ? cardRotations[i] : 0))
                    .offset(
                        x: fanned ? cardOffsets[i] : 0,
                        y: fanned ? 0 : CGFloat(i) * -4
                    )
                    .zIndex(Double(i))
                    .animation(
                        .spring(response: 0.5, dampingFraction: 0.7).delay(Double(i) * 0.08),
                        value: fanned
                    )
            }

            // Waveform on front card
            if showWaveform {
                HStack(alignment: .center, spacing: 3) {
                    ForEach(0..<5, id: \.self) { i in
                        let heights: [CGFloat] = [8, 14, 20, 14, 8]
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Theme.accent)
                            .frame(width: 3, height: heights[i] * barScales[i])
                    }
                }
                .offset(x: 20, y: 30)
                .zIndex(4)
                .transition(.opacity)
            }

            // Speech bubble icon
            if showBubble {
                Image(systemName: "bubble.left.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.accent.opacity(0.7))
                    .offset(x: 52, y: 30)
                    .zIndex(4)
                    .transition(.opacity.combined(with: .scale(scale: 0.5)))
            }
        }
        .onChange(of: isActive) { _, active in
            if active { playIn() } else { resetState() }
        }
        .onAppear { if isActive { playIn() } }
    }

    private func playIn() {
        resetState()
        withAnimation {
            fanned = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            withAnimation(.easeOut(duration: 0.3)) {
                showWaveform = true
            }
            triggerBounce()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                    showBubble = true
                }
            }
        }
    }

    private func triggerBounce() {
        for i in 0..<5 {
            let delay = Double(i) * 0.05
            withAnimation(.spring(response: 0.25, dampingFraction: 0.4).delay(delay)) {
                barScales[i] = 1.4
            }
            withAnimation(.spring(response: 0.3, dampingFraction: 0.5).delay(delay + 0.15)) {
                barScales[i] = 1.0
            }
        }
    }

    private func resetState() {
        fanned = false
        showWaveform = false
        showBubble = false
        barScales = [1, 1, 1, 1, 1]
    }
}

// MARK: - Page 3: "memory lane"

struct MemoryLaneAnimation: View {
    let isActive: Bool
    @State private var showMainCard = false
    @State private var showBehindCard = false
    @State private var showLines: [Bool] = [false, false]
    @State private var showBadge = false
    @State private var showGlow = false

    var body: some View {
        ZStack {
            // Warm glow on the right side
            Circle()
                .fill(Theme.accent.opacity(0.12))
                .frame(width: 70, height: 70)
                .offset(x: 100, y: 10)
                .opacity(showGlow ? 1 : 0)
                .scaleEffect(showGlow ? 1 : 0.4)
                .animation(.easeOut(duration: 0.8).delay(0.7), value: showGlow)

            // Behind card (peek from left)
            RoundedRectangle(cornerRadius: 16)
                .fill(Theme.card)
                .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
                .frame(width: 200, height: 130)
                .overlay {
                    VStack(alignment: .leading, spacing: 7) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Theme.accent.opacity(0.15))
                            .frame(width: 120, height: 8)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Theme.accent.opacity(0.12))
                            .frame(width: 90, height: 8)
                    }
                    .padding(14)
                    .frame(width: 200, height: 130, alignment: .topLeading)
                }
                .offset(x: showBehindCard ? -18 : -50, y: 6)
                .opacity(showBehindCard ? 0.7 : 0)
                .animation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.4), value: showBehindCard)

            // Main memory card
            RoundedRectangle(cornerRadius: 16)
                .fill(Theme.card)
                .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
                .frame(width: 200, height: 130)
                .overlay {
                    // Subtle accent tint
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Theme.accent.opacity(0.05))
                }
                .overlay {
                    VStack(alignment: .leading, spacing: 0) {
                        // Duration badge
                        HStack {
                            Spacer()
                            Text("3mo ago")
                                .font(Theme.dmSans(11, weight: .medium))
                                .foregroundStyle(Theme.accent)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(
                                    Capsule()
                                        .fill(Theme.accent.opacity(0.12))
                                )
                                .opacity(showBadge ? 1 : 0)
                                .scaleEffect(showBadge ? 1 : 0.7)
                                .animation(.spring(response: 0.35, dampingFraction: 0.6).delay(0.8), value: showBadge)
                        }

                        Spacer().frame(height: 10)

                        // Lyric placeholders
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(0..<2, id: \.self) { i in
                                let widths: [CGFloat] = [140, 110]
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Theme.accent.opacity(0.35))
                                    .frame(width: widths[i], height: 9)
                                    .opacity(showLines[i] ? 1 : 0)
                                    .offset(x: showLines[i] ? 0 : -6)
                                    .animation(
                                        .easeOut(duration: 0.4).delay(0.5 + Double(i) * 0.12),
                                        value: showLines[i]
                                    )
                            }
                        }

                        Spacer()

                        // Song metadata
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Theme.accent.opacity(0.2))
                            .frame(width: 80, height: 5)
                    }
                    .padding(14)
                    .frame(width: 200, height: 130, alignment: .topLeading)
                }
                .offset(x: showMainCard ? 0 : -40)
                .opacity(showMainCard ? 1 : 0)
                .animation(.spring(response: 0.5, dampingFraction: 0.7), value: showMainCard)
        }
        .onChange(of: isActive) { _, active in
            if active { playIn() } else { resetState() }
        }
        .onAppear { if isActive { playIn() } }
    }

    private func playIn() {
        resetState()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            showMainCard = true
            for i in 0..<2 { showLines[i] = true }
            showBehindCard = true
            showBadge = true
            showGlow = true
        }
    }

    private func resetState() {
        showMainCard = false
        showBehindCard = false
        showLines = [false, false]
        showBadge = false
        showGlow = false
    }
}

// MARK: - Page 4: "build your collection"

struct CollectionAnimation: View {
    let isActive: Bool
    @State private var arranged = false
    @State private var showBookmark = false

    private let accentTones: [Color] = [
        Theme.accent,
        Theme.accent.opacity(0.7),
        Theme.accent.opacity(0.5),
        Theme.accent.opacity(0.85)
    ]

    private let scatteredOffsets: [(x: CGFloat, y: CGFloat)] = [
        (-60, -40), (70, -30), (-50, 50), (60, 60)
    ]
    private let gridOffsets: [(x: CGFloat, y: CGFloat)] = [
        (-35, -35), (35, -35), (-35, 35), (35, 35)
    ]

    var body: some View {
        ZStack {
            // Bookmark icon
            Image(systemName: "bookmark.fill")
                .font(.system(size: 24))
                .foregroundStyle(Theme.accent)
                .offset(y: -90)
                .opacity(showBookmark ? 1 : 0)
                .scaleEffect(showBookmark ? 1 : 0.3)
                .animation(.spring(response: 0.35, dampingFraction: 0.5).delay(0.5), value: showBookmark)

            ForEach(0..<4, id: \.self) { i in
                let from = scatteredOffsets[i]
                let to = gridOffsets[i]
                RoundedRectangle(cornerRadius: 10)
                    .fill(Theme.card)
                    .shadow(color: .black.opacity(0.06), radius: 6, y: 2)
                    .frame(width: 60, height: 60)
                    .overlay(alignment: .top) {
                        // Colored accent bar at top
                        RoundedRectangle(cornerRadius: 2)
                            .fill(accentTones[i])
                            .frame(width: 52, height: 4)
                            .padding(.top, 6)
                    }
                    .overlay {
                        // Tiny Caveat-style placeholders
                        VStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Theme.accent.opacity(0.3))
                                .frame(width: 36, height: 5)
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Theme.accent.opacity(0.2))
                                .frame(width: 28, height: 5)
                        }
                        .offset(y: 4)
                    }
                    .offset(
                        x: arranged ? to.x : from.x,
                        y: arranged ? to.y : from.y
                    )
                    .animation(
                        .spring(response: 0.45, dampingFraction: 0.7).delay(Double(i) * 0.1),
                        value: arranged
                    )
            }
        }
        .onChange(of: isActive) { _, active in
            if active { playIn() } else { resetState() }
        }
        .onAppear { if isActive { playIn() } }
    }

    private func playIn() {
        resetState()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            arranged = true
            showBookmark = true
        }
    }

    private func resetState() {
        arranged = false
        showBookmark = false
    }
}

// MARK: - Page 5: "what's that song?"

struct WhatsThatSongAnimation: View {
    let isActive: Bool
    @State private var showInput = false
    @State private var typedText = ""
    @State private var showResult = false
    @State private var typingTimer: Timer?

    private let fullText = "I got sunshine"

    var body: some View {
        VStack(spacing: 16) {
            // Input area
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.dividerColor, lineWidth: 1.5)
                .frame(width: 220, height: 100)
                .overlay {
                    Text(typedText)
                        .font(Theme.caveat(20))
                        .foregroundStyle(Theme.textPrimary)
                        .frame(width: 190, height: 80, alignment: .topLeading)
                        .padding(.horizontal, 15)
                        .padding(.vertical, 10)
                }
                .opacity(showInput ? 1 : 0)
                .scaleEffect(showInput ? 1 : 0.95)
                .animation(.spring(response: 0.4, dampingFraction: 0.7), value: showInput)

            // Match result pill
            if showResult {
                HStack(spacing: 10) {
                    Image(systemName: "music.note")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.accent)

                    VStack(alignment: .leading, spacing: 3) {
                        Text("My Girl")
                            .font(Theme.dmSans(13, weight: .medium))
                            .foregroundStyle(Theme.textPrimary)
                        Text("The Temptations")
                            .font(Theme.dmSans(11))
                            .foregroundStyle(Theme.textMuted)
                    }

                    Spacer()

                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Theme.accent)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .frame(width: 220)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Theme.card)
                        .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
                )
                .transition(.move(edge: .bottom).combined(with: .opacity).combined(with: .scale(scale: 0.9)))
            }
        }
        .onChange(of: isActive) { _, active in
            if active { playIn() } else { resetState() }
        }
        .onAppear { if isActive { playIn() } }
    }

    private func playIn() {
        resetState()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            showInput = true
        }
        // Typewriter effect
        var charIndex = 0
        let characters = Array(fullText)
        typingTimer = Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { timer in
            if charIndex < characters.count {
                typedText.append(characters[charIndex])
                charIndex += 1
            } else {
                timer.invalidate()
                // Show result after typing finishes
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.6)) {
                        showResult = true
                    }
                }
            }
        }
    }

    private func resetState() {
        typingTimer?.invalidate()
        typingTimer = nil
        showInput = false
        typedText = ""
        showResult = false
    }
}
