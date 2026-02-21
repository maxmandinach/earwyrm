import Foundation

/// Actor-isolated MusicBrainz client with 1 req/s rate limiting.
/// Ported from src/lib/musicbrainz.js.
actor MusicBrainzService {
    static let shared = MusicBrainzService()

    private let mbBase = "https://musicbrainz.org/ws/2"
    private let caaBase = "https://coverartarchive.org"
    private let headers = [
        "Accept": "application/json",
        "User-Agent": "Earwyrm/1.0 (iOS; contact@earwyrm.app)"
    ]

    private var lastRequestTime: Date = .distantPast

    // MARK: - Rate Limiting

    private func throttle() async {
        let elapsed = Date().timeIntervalSince(lastRequestTime)
        if elapsed < 1.0 {
            try? await Task.sleep(for: .milliseconds(Int((1.0 - elapsed) * 1000)))
        }
        lastRequestTime = Date()
    }

    // MARK: - Artist Search

    func searchArtists(query: String, limit: Int = 5) async -> [MBArtist] {
        guard query.count >= 2 else { return [] }
        await throttle()

        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let url = "\(mbBase)/artist?query=\(encoded)&fmt=json&limit=\(limit)"

        do {
            let response: MBArtistSearchResponse = try await HTTPClient.get(url, headers: headers)
            return response.artists ?? []
        } catch {
            print("MusicBrainz artist search error: \(error)")
            return []
        }
    }

    // MARK: - Recording Search by Artist ID

    /// Two parallel searches: filtered (no live) + broad, fallback fuzzy.
    /// Deduplicates and ranks results (studio > live, exact match > remix).
    func searchRecordingsByArtistId(
        artistId: String,
        query: String,
        limit: Int = 8
    ) async -> [MappedRecording] {
        guard !artistId.isEmpty, query.count >= 2 else { return [] }

        let baseQuery = "arid:\(artistId) AND recording:\"\(query)\""

        do {
            await throttle()

            let filteredEncoded = (baseQuery + " NOT secondarytype:live")
                .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let filteredUrl = "\(mbBase)/recording?query=\(filteredEncoded)&fmt=json&limit=15"

            // Need to wait between requests due to rate limit
            let filteredResponse: MBRecordingSearchResponse = try await HTTPClient.get(
                filteredUrl, headers: headers
            )

            await throttle()

            let broadEncoded = baseQuery
                .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let broadUrl = "\(mbBase)/recording?query=\(broadEncoded)&fmt=json&limit=15"

            let broadResponse: MBRecordingSearchResponse = try await HTTPClient.get(
                broadUrl, headers: headers
            )

            var allRecordings: [MBRecording] = []
            var seenIds = Set<String>()

            // Add filtered results first
            for rec in filteredResponse.recordings ?? [] {
                allRecordings.append(rec)
                seenIds.insert(rec.id)
            }

            // Add broad results that aren't duplicates
            for rec in broadResponse.recordings ?? [] {
                if !seenIds.contains(rec.id) {
                    allRecordings.append(rec)
                    seenIds.insert(rec.id)
                }
            }

            // Fuzzy fallback if no results
            if allRecordings.isEmpty {
                await throttle()
                let fuzzyQuery = "arid:\(artistId) AND recording:\(query)~"
                let fuzzyEncoded = fuzzyQuery
                    .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                let fuzzyUrl = "\(mbBase)/recording?query=\(fuzzyEncoded)&fmt=json&limit=15"
                let fuzzyResponse: MBRecordingSearchResponse = try await HTTPClient.get(
                    fuzzyUrl, headers: headers
                )
                allRecordings = fuzzyResponse.recordings ?? []
            }

            let ranked = dedupeAndRank(allRecordings, limit: limit, query: query)
            return ranked.map { mapRecording($0) }
        } catch {
            print("MusicBrainz recording search error: \(error)")
            return []
        }
    }

    // MARK: - Cover Art

    func getCoverArt(releaseGroupId: String?, releaseId: String?) async -> String? {
        // Try release group first (more reliable)
        if let rgId = releaseGroupId {
            if let url = await fetchCoverArt(path: "/release-group/\(rgId)") {
                return url
            }
        }
        // Fallback to release
        if let rId = releaseId {
            return await fetchCoverArt(path: "/release/\(rId)")
        }
        return nil
    }

    private func fetchCoverArt(path: String) async -> String? {
        let url = "\(caaBase)\(path)"
        do {
            let response: CoverArtResponse = try await HTTPClient.get(url, headers: ["Accept": "application/json"])
            let front = response.images?.first { $0.front == true }
            return front?.thumbnails?.bestUrl
        } catch {
            return nil
        }
    }

    // MARK: - Dedup & Ranking (ported from musicbrainz.js)

    private func isStudioRelease(_ release: MBRelease) -> Bool {
        let dominated = Set(["Live", "Compilation", "Remix", "DJ-mix", "Mixtape/Street", "Demo", "Bootleg"])
        let secondary = release.releaseGroup?.secondaryTypes ?? release.secondaryTypes ?? []
        return !secondary.contains(where: { dominated.contains($0) })
    }

    private func isJunkTitle(_ title: String?) -> Bool {
        guard let t = title?.trimmingCharacters(in: .whitespaces), !t.isEmpty else { return true }
        if t.hasPrefix("[") && t.hasSuffix("]") { return true }
        if t.hasPrefix("(") && t.hasSuffix(")") { return true }
        return false
    }

    private func isLiveRecording(_ rec: MBRecording) -> Bool {
        let dis = rec.disambiguation ?? ""
        if dis.range(of: #"\b(live|bootleg|concert)\b"#, options: .regularExpression, range: nil, locale: nil) != nil {
            return true
        }
        if dis.range(of: #"\d{4}-\d{2}-\d{2}:"#, options: .regularExpression) != nil {
            return true
        }
        if rec.title.range(of: #"\b(live at|live in|live from|live:)\b"#, options: [.regularExpression, .caseInsensitive]) != nil {
            return true
        }
        let releases = rec.releases ?? []
        if !releases.isEmpty {
            let hasStudio = releases.contains(where: { isStudioRelease($0) })
            if !hasStudio { return true }
        }
        return false
    }

    private func isLiveShowTitle(_ title: String?) -> Bool {
        guard let title else { return false }
        return title.range(of: #"\d{4}[-‐‑–]\d{2}[-‐‑–]\d{2}"#, options: .regularExpression) != nil
    }

    private func findBestRelease(_ releases: [MBRelease]?) -> MBRelease? {
        guard let releases, !releases.isEmpty else { return nil }
        if let r = releases.first(where: { isStudioRelease($0) && !isLiveShowTitle($0.title) }) { return r }
        if let r = releases.first(where: { isStudioRelease($0) }) { return r }
        if let r = releases.first(where: { !isLiveShowTitle($0.title) }) { return r }
        return releases.first
    }

    private func titleRelevanceScore(_ title: String, query: String) -> Int {
        let t = title.lowercased().trimmingCharacters(in: .whitespaces)
        let q = query.lowercased().trimmingCharacters(in: .whitespaces)

        if t == q { return 100 }

        let base = t.replacingOccurrences(of: #"\s*\(.*\)\s*$"#, with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespaces)
        if base == q { return 90 }
        if base.hasPrefix(q) { return 80 }
        if title.range(of: #"\b(instrumental)\b"#, options: [.regularExpression, .caseInsensitive]) != nil { return 30 }
        if title.range(of: #"\b(remix|remixed|mix)\b"#, options: [.regularExpression, .caseInsensitive]) != nil { return 20 }
        if title.range(of: #"\b(karaoke|tribute|cover)\b"#, options: [.regularExpression, .caseInsensitive]) != nil { return 10 }
        if title.range(of: #"\b(radio edit|edit)\b"#, options: [.regularExpression, .caseInsensitive]) != nil { return 60 }
        if title.range(of: #"\b(acoustic|unplugged)\b"#, options: [.regularExpression, .caseInsensitive]) != nil { return 50 }

        return 70
    }

    private func dedupeAndRank(_ recordings: [MBRecording], limit: Int, query: String) -> [MBRecording] {
        let clean = recordings.filter { !isJunkTitle($0.title) }

        // Group by base title
        var groups: [String: [MBRecording]] = [:]
        for rec in clean {
            let key = rec.title.lowercased()
                .trimmingCharacters(in: .whitespaces)
                .replacingOccurrences(of: #"\s*\(.*\)\s*$"#, with: "", options: .regularExpression)
                .trimmingCharacters(in: .whitespaces)
            groups[key, default: []].append(rec)
        }

        // Pick best from each group
        var best: [MBRecording] = []
        for (_, recs) in groups {
            let sorted = recs.sorted { a, b in
                let aStudio = !isLiveRecording(a) ? 1 : 0
                let bStudio = !isLiveRecording(b) ? 1 : 0
                if bStudio != aStudio { return aStudio > bStudio }

                let aRel = titleRelevanceScore(a.title, query: query)
                let bRel = titleRelevanceScore(b.title, query: query)
                if bRel != aRel { return aRel > bRel }

                return (a.score ?? 0) > (b.score ?? 0)
            }
            if let first = sorted.first {
                best.append(first)
            }
        }

        // Sort final results
        best.sort { a, b in
            let aStudio = !isLiveRecording(a) ? 1 : 0
            let bStudio = !isLiveRecording(b) ? 1 : 0
            if bStudio != aStudio { return aStudio > bStudio }

            let aRel = titleRelevanceScore(a.title, query: query)
            let bRel = titleRelevanceScore(b.title, query: query)
            if bRel != aRel { return aRel > bRel }

            return (a.score ?? 0) > (b.score ?? 0)
        }

        return Array(best.prefix(limit))
    }

    private func mapRecording(_ rec: MBRecording) -> MappedRecording {
        let bestRelease = findBestRelease(rec.releases)
        return MappedRecording(
            id: rec.id,
            title: rec.title,
            artist: rec.artistName,
            album: bestRelease?.title,
            releaseId: bestRelease?.id,
            releaseGroupId: bestRelease?.releaseGroup?.id,
            year: bestRelease?.year,
            score: rec.score ?? 0
        )
    }
}
