import Foundation

/// Genius lyric search via Supabase Edge Function proxy.
enum GeniusService {
    private static let endpoint = "\(supabaseUrl)/functions/v1/genius-search"
    private static let supabaseUrl = "https://btrwdmeguitbbvcreokk.supabase.co"
    private static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cndkbWVndWl0YmJ2Y3Jlb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTc1NjAsImV4cCI6MjA4MzM3MzU2MH0.4FpwGF-AqOnpJIVTGG1Er7F2262_Eff1FGk7PA8AY3Y"

    /// Search Genius for songs matching a lyric snippet.
    static func searchByLyrics(_ lyrics: String) async -> [GeniusSuggestion] {
        let trimmed = lyrics.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 10 else { return [] }

        do {
            let response: GeniusSearchResponse = try await HTTPClient.post(
                endpoint,
                body: GeniusSearchRequest(lyrics: trimmed),
                headers: [
                    "Authorization": "Bearer \(anonKey)"
                ]
            )

            // Dedupe by title+artist
            var seen = Set<String>()
            var unique: [GeniusSuggestion] = []
            for result in response.results ?? [] {
                let key = "\(result.title)::\(result.artist ?? "")".lowercased()
                if !seen.contains(key) {
                    seen.insert(key)
                    unique.append(result)
                }
            }

            return Array(unique.prefix(3))
        } catch {
            print("Genius search error: \(error)")
            return []
        }
    }
}
