import Foundation

@Observable
@MainActor
final class ActivityInsightsViewModel {
    var lyricsThisWeek: Int = 0
    var resonancesThisWeek: Int = 0
    var onThisDayLyric: Lyric?
    var onThisDayLabel: String?

    var hasAnythingToShow: Bool {
        lyricsThisWeek > 0 || resonancesThisWeek > 0 || onThisDayLyric != nil
    }

    func fetchInsights(userId: UUID) async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchWeeklyStats(userId: userId) }
            group.addTask { await self.fetchOnThisDay(userId: userId) }
        }
    }

    // MARK: - Weekly Stats

    private func fetchWeeklyStats(userId: UUID) async {
        let sevenDaysAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let cutoff = iso.string(from: sevenDaysAgo)

        // Lyrics posted this week
        do {
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select("id, user_id, content, song_title, artist_name, cover_art_url, album_name, is_current, is_public, tags, share_token, canonical_lyric_id, musicbrainz_recording_id, musicbrainz_release_id, reaction_count, comment_count, card_art_url, created_at, replaced_at")
                .eq("user_id", value: userId.uuidString)
                .gte("created_at", value: cutoff)
                .execute()
                .value
            lyricsThisWeek = lyrics.count
        } catch {
            print("Weekly lyrics error: \(error)")
        }

        // Resonances received this week
        do {
            let reactions: [Reaction] = try await supabase
                .from("reactions")
                .select("id, lyric_id, user_id, created_at, lyrics!inner(user_id)")
                .eq("lyrics.user_id", value: userId.uuidString)
                .gte("created_at", value: cutoff)
                .neq("user_id", value: userId.uuidString)
                .execute()
                .value
            resonancesThisWeek = reactions.count
        } catch {
            print("Weekly resonances error: \(error)")
        }
    }

    // MARK: - On This Day

    private func fetchOnThisDay(userId: UUID) async {
        do {
            let lyrics: [Lyric] = try await supabase
                .from("lyrics")
                .select("id, user_id, content, song_title, artist_name, cover_art_url, album_name, is_current, is_public, tags, share_token, canonical_lyric_id, musicbrainz_recording_id, musicbrainz_release_id, reaction_count, comment_count, card_art_url, created_at, replaced_at")
                .eq("user_id", value: userId.uuidString)
                .order("created_at", ascending: true)
                .limit(200)
                .execute()
                .value

            let calendar = Calendar.current
            let today = Date()
            let todayComponents = calendar.dateComponents([.month, .day], from: today)

            var bestMatch: Lyric?
            var bestLabel: String?

            for lyric in lyrics {
                // Must be from a prior month (not the current month/year combo)
                let lyricComponents = calendar.dateComponents([.year, .month, .day], from: lyric.createdAt)
                let todayFull = calendar.dateComponents([.year, .month], from: today)

                // Skip lyrics from this same month+year
                if lyricComponents.year == todayFull.year && lyricComponents.month == todayFull.month {
                    continue
                }

                // Check ±1 day tolerance on month+day
                guard let todayDay = todayComponents.day,
                      let lyricDay = lyricComponents.day,
                      todayComponents.month == lyricComponents.month,
                      abs(todayDay - lyricDay) <= 1 else {
                    continue
                }

                // Build label — prefer oldest match
                if bestMatch == nil {
                    bestMatch = lyric
                    bestLabel = Self.buildLabel(from: lyric.createdAt, relativeTo: today, calendar: calendar)
                }
            }

            onThisDayLyric = bestMatch
            onThisDayLabel = bestLabel
        } catch {
            print("On this day error: \(error)")
        }
    }

    private static func buildLabel(from date: Date, relativeTo now: Date, calendar: Calendar) -> String {
        let components = calendar.dateComponents([.year, .month], from: date, to: now)
        let years = components.year ?? 0
        let months = components.month ?? 0

        if years >= 1 {
            return years == 1 ? "1 year ago, you saved..." : "\(years) years ago, you saved..."
        } else if months >= 1 {
            return months == 1 ? "1 month ago, you saved..." : "\(months) months ago, you saved..."
        }
        return "a while back, you saved..."
    }
}
