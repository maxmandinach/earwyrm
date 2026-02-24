import SwiftUI

struct OnboardingSplashView: View {
    let onGetStarted: () -> Void

    @State private var breathPhase: CGFloat = 0
    @State private var showWordmark = false
    @State private var showTagline = false
    @State private var showButton = false

    // Particle state
    @State private var particles: [SplashParticle] = []

    var body: some View {
        ZStack {
            Theme.background
                .ignoresSafeArea()

            // Layer 1: Breathing waveform
            Canvas { context, size in
                let midY = size.height * 0.45
                let lineCount = 4
                for line in 0..<lineCount {
                    let lineFraction = CGFloat(line) / CGFloat(lineCount - 1)
                    let frequency = 1.5 + lineFraction * 1.2
                    let phaseOffset = lineFraction * .pi * 0.6
                    let baseAmplitude: CGFloat = 8 + breathPhase * 8
                    let amplitude = baseAmplitude * (0.6 + lineFraction * 0.4)
                    let opacity = 0.15 + lineFraction * 0.1
                    let lineWidth: CGFloat = 1.0 + lineFraction * 0.5
                    let yOffset = (lineFraction - 0.5) * 30

                    var path = Path()
                    for x in stride(from: 0, through: size.width, by: 2) {
                        let normalizedX = x / size.width
                        let y = midY + yOffset + sin(normalizedX * .pi * 2 * frequency + phaseOffset) * amplitude
                        if x == 0 {
                            path.move(to: CGPoint(x: x, y: y))
                        } else {
                            path.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                    context.stroke(
                        path,
                        with: .color(Theme.accent.opacity(opacity)),
                        lineWidth: lineWidth
                    )
                }
            }
            .ignoresSafeArea()

            // Layer 2: Drifting particles
            ForEach(particles) { particle in
                Circle()
                    .fill(Theme.accent.opacity(particle.opacity))
                    .frame(width: particle.size, height: particle.size)
                    .position(particle.position)
            }
            .ignoresSafeArea()

            // Layer 3: Wordmark + CTA
            VStack(spacing: Theme.Spacing.md) {
                Spacer()

                CaveatText(text: "earwyrm", size: 42, color: Theme.textPrimary)
                    .opacity(showWordmark ? 1 : 0)
                    .offset(y: showWordmark ? 0 : 8)
                    .animation(.easeOut(duration: 0.8), value: showWordmark)

                Text("your lyric journal")
                    .font(Theme.dmSans(15))
                    .foregroundStyle(Theme.textSecondary)
                    .opacity(showTagline ? 1 : 0)
                    .offset(y: showTagline ? 0 : 8)
                    .animation(.easeOut(duration: 0.8), value: showTagline)

                Spacer()

                Button {
                    Haptics.light()
                    onGetStarted()
                } label: {
                    Text("Get Started")
                        .font(Theme.dmSans(16, weight: .medium))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Theme.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, Theme.Spacing.lg)
                .opacity(showButton ? 1 : 0)
                .offset(y: showButton ? 0 : 8)
                .animation(.easeOut(duration: 0.8), value: showButton)

                Spacer()
                    .frame(height: Theme.Spacing.xxl)
            }
        }
        .onAppear {
            Analytics.track(.onboardingSplashShown)
            startBreathingAnimation()
            generateParticles()
            scheduleReveals()
        }
    }

    // MARK: - Breathing waveform

    private func startBreathingAnimation() {
        withAnimation(.easeInOut(duration: 4.0).repeatForever(autoreverses: true)) {
            breathPhase = 1.0
        }
    }

    // MARK: - Particles

    private func generateParticles() {
        let screenWidth = UIScreen.main.bounds.width
        let screenHeight = UIScreen.main.bounds.height

        particles = (0..<18).map { _ in
            SplashParticle(
                position: CGPoint(
                    x: CGFloat.random(in: 20...(screenWidth - 20)),
                    y: CGFloat.random(in: 40...(screenHeight - 40))
                ),
                targetPosition: CGPoint(
                    x: CGFloat.random(in: 20...(screenWidth - 20)),
                    y: CGFloat.random(in: 40...(screenHeight - 40))
                ),
                size: CGFloat.random(in: 2...4),
                opacity: Double.random(in: 0.12...0.3),
                duration: Double.random(in: 8...14)
            )
        }

        // Start drifting
        for i in particles.indices {
            let duration = particles[i].duration
            withAnimation(.linear(duration: duration).repeatForever(autoreverses: true)) {
                particles[i].position = particles[i].targetPosition
            }
        }
    }

    // MARK: - Timed reveals

    private func scheduleReveals() {
        Task {
            try? await Task.sleep(for: .seconds(0.8))
            showWordmark = true
            try? await Task.sleep(for: .seconds(0.4))
            showTagline = true
            try? await Task.sleep(for: .seconds(0.4))
            showButton = true
        }
    }
}

// MARK: - Particle model

struct SplashParticle: Identifiable {
    let id = UUID()
    var position: CGPoint
    let targetPosition: CGPoint
    let size: CGFloat
    let opacity: Double
    let duration: Double
}
